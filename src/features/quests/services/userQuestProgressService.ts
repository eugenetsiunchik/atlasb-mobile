import {
  collection,
  doc,
  onSnapshot,
  Timestamp,
  writeBatch,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import { getLevelFromXp } from '../../../services/gamification';
import {
  USER_ACHIEVEMENTS_SUBCOLLECTION_NAME,
  type FirestoreUserAchievement,
} from '../../../services/gamification/achievementTypes';
import type { QuestDefinition, QuestProgressEvaluation, UserQuestProgress } from '../types';
import {
  USER_QUEST_PROGRESS_SUBCOLLECTION_NAME,
  type FirestoreUserQuestProgress,
} from '../types';

const USERS_COLLECTION_NAME = 'users';

function getUserDocument(uid: string) {
  return doc(collection(getFirebaseFirestore(), USERS_COLLECTION_NAME), uid);
}

function getUserQuestProgressCollection(uid: string) {
  return collection(getUserDocument(uid), USER_QUEST_PROGRESS_SUBCOLLECTION_NAME);
}

function getUserQuestProgressDocument(uid: string, questId: string) {
  return doc(getUserQuestProgressCollection(uid), questId);
}

function getUserAchievementDocument(uid: string, achievementId: string) {
  return doc(
    collection(getUserDocument(uid), USER_ACHIEVEMENTS_SUBCOLLECTION_NAME),
    achievementId,
  );
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

function normalizeUserQuestProgress(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): UserQuestProgress | null {
  const data = documentSnapshot.data() as FirestoreUserQuestProgress | undefined;

  if (!data) {
    return null;
  }

  const questId =
    typeof data.questId === 'string' && data.questId.trim() ? data.questId.trim() : documentSnapshot.id;
  const progressLabel =
    typeof data.progressLabel === 'string' && data.progressLabel.trim()
      ? data.progressLabel.trim()
      : '0/0 complete';

  if (!questId) {
    return null;
  }

  return {
    completedAtMs: readTimestampMs(data.completedAt),
    currentCount: typeof data.currentCount === 'number' ? data.currentCount : 0,
    matchedPlaceIds: Array.isArray(data.matchedPlaceIds)
      ? data.matchedPlaceIds.filter((value): value is string => typeof value === 'string')
      : [],
    matchedTargetIds: Array.isArray(data.matchedTargetIds)
      ? data.matchedTargetIds.filter((value): value is string => typeof value === 'string')
      : [],
    progressLabel,
    questId,
    rewardAchievementIds: Array.isArray(data.rewardAchievementIds)
      ? data.rewardAchievementIds.filter((value): value is string => typeof value === 'string')
      : [],
    rewardAppliedAtMs: readTimestampMs(data.rewardAppliedAt),
    rewardXp: typeof data.rewardXp === 'number' ? data.rewardXp : 0,
    status: data.status === 'completed' ? 'completed' : 'active',
    targetCount: typeof data.targetCount === 'number' ? data.targetCount : 0,
    updatedAtMs: readTimestampMs(data.updatedAt),
  };
}

export function subscribeToUserQuestProgress(
  uid: string,
  options: {
    onError: (message: string) => void;
    onSuccess: (progresses: UserQuestProgress[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onSuccess([]);
    return () => undefined;
  }

  return onSnapshot(
    getUserQuestProgressCollection(uid),
    snapshot => {
      const progresses = snapshot.docs
        .map(normalizeUserQuestProgress)
        .filter(
          (progress: UserQuestProgress | null): progress is UserQuestProgress =>
            progress !== null,
        );

      options.onSuccess(progresses);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe user quest progress failed',
        {
          operation: 'onSnapshot',
          path: `users/${uid}/${USER_QUEST_PROGRESS_SUBCOLLECTION_NAME}`,
          uid,
        },
        error,
      );
      options.onError(
        error instanceof Error
          ? error.message
          : 'Unable to load quest progress from Firestore.',
      );
    },
  );
}

export async function applyQuestProgressEvaluations(params: {
  currentXp: number;
  evaluations: QuestProgressEvaluation[];
  questsById: Readonly<Record<string, QuestDefinition>>;
  uid: string;
  unlockedAchievementIds: Iterable<string>;
}) {
  const { currentXp, evaluations, questsById, uid, unlockedAchievementIds } = params;
  const safeCurrentXp =
    Number.isFinite(currentXp) && currentXp > 0 ? Math.floor(currentXp) : 0;
  const unlockedIds = new Set(unlockedAchievementIds);

  if (evaluations.length === 0) {
    return {
      nextLevel: getLevelFromXp(safeCurrentXp),
      nextXp: safeCurrentXp,
      progresses: [] as UserQuestProgress[],
      rewardAppliedCount: 0,
    };
  }

  if (!isFirebaseConfigured()) {
    return {
      nextLevel: getLevelFromXp(safeCurrentXp),
      nextXp: safeCurrentXp,
      progresses: evaluations.map(({ shouldApplyRewards: _shouldApplyRewards, ...progress }) => ({
        ...progress,
      })),
      rewardAppliedCount: 0,
    };
  }

  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);
  const nextProgresses: UserQuestProgress[] = [];
  let nextXp = safeCurrentXp;
  let rewardAppliedCount = 0;

  for (const evaluation of evaluations) {
    const { shouldApplyRewards, ...baseProgress } = evaluation;
    const quest = questsById[evaluation.questId];
    const rewardAppliedAtMs = shouldApplyRewards ? Date.now() : baseProgress.rewardAppliedAtMs;
    const nextProgress: UserQuestProgress = {
      ...baseProgress,
      rewardAppliedAtMs,
    };

    nextProgresses.push(nextProgress);

    const payload: FirestoreUserQuestProgress = {
      currentCount: nextProgress.currentCount,
      matchedPlaceIds: nextProgress.matchedPlaceIds,
      matchedTargetIds: nextProgress.matchedTargetIds,
      progressLabel: nextProgress.progressLabel,
      questId: nextProgress.questId,
      rewardAchievementIds: nextProgress.rewardAchievementIds,
      rewardXp: nextProgress.rewardXp,
      status: nextProgress.status,
      targetCount: nextProgress.targetCount,
    };

    batch.set(
      getUserQuestProgressDocument(uid, evaluation.questId),
      {
        ...payload,
        completedAt: nextProgress.completedAtMs
          ? Timestamp.fromMillis(nextProgress.completedAtMs)
          : null,
        rewardAppliedAt: rewardAppliedAtMs ? Timestamp.fromMillis(rewardAppliedAtMs) : null,
        updatedAt: Timestamp.fromMillis(nextProgress.updatedAtMs ?? Date.now()),
      },
      { merge: true },
    );

    if (!shouldApplyRewards || !quest) {
      continue;
    }

    rewardAppliedCount += 1;
    nextXp += quest.reward.xp;

    for (const unlock of quest.reward.achievementUnlocks) {
      if (unlockedIds.has(unlock.achievementId)) {
        continue;
      }

      const achievementPayload: FirestoreUserAchievement = {
        achievementId: unlock.achievementId,
        category: unlock.category,
        configVersion: unlock.configVersion,
        description: unlock.description,
        icon: unlock.icon,
        title: unlock.title,
        unlockedAt: Timestamp.fromMillis(rewardAppliedAtMs ?? Date.now()),
        unlockedBy: 'client',
        xpReward: unlock.xpReward,
      };

      batch.set(getUserAchievementDocument(uid, unlock.achievementId), achievementPayload, {
        merge: true,
      });
      unlockedIds.add(unlock.achievementId);
      nextXp += unlock.xpReward;
    }
  }

  const nextLevel = getLevelFromXp(nextXp);

  if (rewardAppliedCount > 0) {
    batch.set(
      getUserDocument(uid),
      {
        level: nextLevel,
        xp: nextXp,
      },
      { merge: true },
    );
  }

  try {
    await batch.commit();
  } catch (error) {
    logFirebaseError(
      'Firestore write quest progress failed',
      {
        operation: 'batch.commit',
        path: `users/${uid}`,
        uid,
      },
      error,
    );
    throw error;
  }

  return {
    nextLevel,
    nextXp,
    progresses: nextProgresses,
    rewardAppliedCount,
  };
}

export function getQuestProgressConfigurationErrorMessage() {
  return getFirebaseConfigurationErrorMessage();
}
