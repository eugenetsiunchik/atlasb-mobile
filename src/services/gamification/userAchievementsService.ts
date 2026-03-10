import {
  collection,
  doc,
  onSnapshot,
  Timestamp,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import { getLevelFromXp } from './gamificationService';
import {
  USER_ACHIEVEMENTS_SUBCOLLECTION_NAME,
  type FirestoreUserAchievement,
  type UserAchievement,
  type AchievementUnlockDraft,
  type AchievementUnlockSource,
} from './achievementTypes';
import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../firebase';

const USERS_COLLECTION_NAME = 'users';

function getUserDocument(uid: string) {
  return doc(collection(getFirebaseFirestore(), USERS_COLLECTION_NAME), uid);
}

function getUserAchievementsCollection(uid: string) {
  return collection(getUserDocument(uid), USER_ACHIEVEMENTS_SUBCOLLECTION_NAME);
}

function getUserAchievementDocument(uid: string, achievementId: string) {
  return doc(getUserAchievementsCollection(uid), achievementId);
}

function readTimestampMs(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

function normalizeUserAchievement(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): UserAchievement | null {
  const data = documentSnapshot.data() as FirestoreUserAchievement | undefined;

  if (!data) {
    return null;
  }

  const achievementId =
    typeof data.achievementId === 'string' && data.achievementId.trim()
      ? data.achievementId
      : documentSnapshot.id;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description =
    typeof data.description === 'string' ? data.description.trim() : '';
  const unlockedAtMs = readTimestampMs(data.unlockedAt);

  if (!achievementId || !title || !description || unlockedAtMs === null) {
    return null;
  }

  return {
    achievementId,
    category: data.category ?? 'exploration',
    configVersion: data.configVersion ?? '',
    description,
    icon: data.icon ?? 'trophy',
    title,
    unlockedAtMs,
    unlockedBy: data.unlockedBy ?? 'client',
    xpReward: typeof data.xpReward === 'number' ? data.xpReward : 0,
  };
}

export function subscribeToUserAchievements(
  uid: string,
  options: {
    onError: (message: string) => void;
    onSuccess: (achievements: UserAchievement[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  return onSnapshot(
    getUserAchievementsCollection(uid),
    (
      snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>,
    ) => {
      const achievements = snapshot.docs
        .map(normalizeUserAchievement)
        .reduce<UserAchievement[]>((result, achievement) => {
          if (achievement) {
            result.push(achievement);
          }

          return result;
        }, [])
        .sort((left, right) => right.unlockedAtMs - left.unlockedAtMs);

      options.onSuccess(achievements);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe user achievements failed',
        {
          operation: 'onSnapshot',
          path: `users/${uid}/${USER_ACHIEVEMENTS_SUBCOLLECTION_NAME}`,
          uid,
        },
        error,
      );
      options.onError(
        error instanceof Error
          ? error.message
          : 'Unable to load unlocked achievements from Firestore.',
      );
    },
  );
}

export async function applyAchievementUnlocks(params: {
  currentXp: number;
  source: AchievementUnlockSource;
  uid: string;
  unlocks: AchievementUnlockDraft[];
}) {
  const { currentXp, source, uid, unlocks } = params;

  if (unlocks.length === 0) {
    const safeCurrentXp =
      Number.isFinite(currentXp) && currentXp > 0 ? Math.floor(currentXp) : 0;

    return {
      nextLevel: getLevelFromXp(safeCurrentXp),
      nextXp: safeCurrentXp,
      unlockedCount: 0,
    };
  }

  const firestore = getFirebaseFirestore();
  const batch = firestore.batch();
  const profileDocument = getUserDocument(uid);
  const xpAwardTotal = unlocks.reduce((sum, unlock) => sum + unlock.xpReward, 0);
  const safeCurrentXp =
    Number.isFinite(currentXp) && currentXp > 0 ? Math.floor(currentXp) : 0;
  const nextXp = safeCurrentXp + xpAwardTotal;
  const nextLevel = getLevelFromXp(nextXp);

  for (const unlock of unlocks) {
    const achievementDocument = getUserAchievementDocument(uid, unlock.achievementId);
    const payload: FirestoreUserAchievement = {
      achievementId: unlock.achievementId,
      category: unlock.category,
      configVersion: unlock.configVersion,
      description: unlock.description,
      icon: unlock.icon,
      title: unlock.title,
      unlockedBy: source,
      xpReward: unlock.xpReward,
    };

    batch.set(
      achievementDocument,
      {
        ...payload,
        unlockedAt: Timestamp.fromMillis(unlock.unlockedAtMs),
      },
      { merge: true },
    );
  }

  batch.set(
    profileDocument,
    {
      level: nextLevel,
      xp: nextXp,
    },
    { merge: true },
  );

  try {
    await batch.commit();
  } catch (error) {
    logFirebaseError(
      'Firestore write user achievements failed',
      {
        operation: 'batch.commit',
        path: `users/${uid}`,
        uid,
        unlocks,
      },
      error,
    );
    throw error;
  }

  return {
    nextLevel,
    nextXp,
    unlockedCount: unlocks.length,
  };
}
