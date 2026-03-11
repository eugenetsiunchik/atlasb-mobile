import {
  collection,
  onSnapshot,
  query,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import { SAMPLE_QUESTS } from '../sampleQuests';
import {
  QUESTS_COLLECTION_NAME,
  type FirestoreQuest,
  type QuestDefinition,
  type QuestObjective,
  type QuestPlaceMatcher,
  type QuestPlaceTarget,
  type QuestReward,
  type QuestStatus,
  type QuestType,
} from '../types';
import type { AchievementUnlockDraft } from '../../../services/gamification';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeQuestPlaceMatcher(value: unknown): QuestPlaceMatcher | null {
  if (!isRecord(value)) {
    return null;
  }

  const matcher: QuestPlaceMatcher = {};

  if (typeof value.placeId === 'string' && value.placeId.trim()) {
    matcher.placeId = value.placeId.trim();
  }

  if (typeof value.nameEquals === 'string' && value.nameEquals.trim()) {
    matcher.nameEquals = value.nameEquals.trim();
  }

  if (typeof value.nameIncludes === 'string' && value.nameIncludes.trim()) {
    matcher.nameIncludes = value.nameIncludes.trim();
  }

  if (typeof value.region === 'string' && value.region.trim()) {
    matcher.region = value.region.trim();
  }

  return Object.keys(matcher).length > 0 ? matcher : null;
}

function normalizeQuestPlaceTarget(value: unknown): QuestPlaceTarget | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  const matcher = normalizeQuestPlaceMatcher(value.matcher);

  if (!id || !label || !matcher) {
    return null;
  }

  return {
    id,
    label,
    matcher,
  };
}

function normalizeQuestReward(value: unknown): QuestReward | null {
  if (!isRecord(value)) {
    return null;
  }

  const xp = typeof value.xp === 'number' ? Math.max(0, Math.floor(value.xp)) : 0;
  const achievementUnlocks: AchievementUnlockDraft[] = Array.isArray(value.achievementUnlocks)
    ? value.achievementUnlocks.filter(isRecord).flatMap(unlock => {
        const achievementId =
          typeof unlock.achievementId === 'string' ? unlock.achievementId.trim() : '';
        const title = typeof unlock.title === 'string' ? unlock.title.trim() : '';
        const description =
          typeof unlock.description === 'string' ? unlock.description.trim() : '';

        if (!achievementId || !title || !description) {
          return [];
        }

        return [
          {
            achievementId,
            category: unlock.category === 'quest' ? 'quest' : 'quest',
            configVersion:
              typeof unlock.configVersion === 'string' && unlock.configVersion.trim()
                ? unlock.configVersion.trim()
                : '',
            description,
            icon: unlock.icon === 'camera' ||
              unlock.icon === 'compass' ||
              unlock.icon === 'map' ||
              unlock.icon === 'map-pin' ||
              unlock.icon === 'scroll' ||
              unlock.icon === 'trophy'
              ? unlock.icon
              : 'trophy',
            title,
            unlockedAtMs: typeof unlock.unlockedAtMs === 'number' ? unlock.unlockedAtMs : 0,
            xpReward:
              typeof unlock.xpReward === 'number' ? Math.max(0, Math.floor(unlock.xpReward)) : 0,
          },
        ];
      })
    : [];

  return {
    achievementUnlocks,
    xp,
  };
}

function normalizeQuestObjective(value: unknown): QuestObjective | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  switch (value.type as QuestType) {
    case 'visitSpecificPlaces': {
      const places = Array.isArray(value.places)
        ? value.places
            .map(normalizeQuestPlaceTarget)
            .filter((place): place is QuestPlaceTarget => place !== null)
        : [];

      return places.length > 0
        ? {
            places,
            type: 'visitSpecificPlaces',
          }
        : null;
    }
    case 'visitPlacesInRegion': {
      const region = typeof value.region === 'string' ? value.region.trim() : '';
      const requiredCount =
        typeof value.requiredCount === 'number' ? Math.max(1, Math.floor(value.requiredCount)) : 0;

      return region && requiredCount > 0
        ? {
            region,
            requiredCount,
            type: 'visitPlacesInRegion',
          }
        : null;
    }
    case 'completeThemedCollection': {
      const themeLabel = typeof value.themeLabel === 'string' ? value.themeLabel.trim() : '';
      const places = Array.isArray(value.places)
        ? value.places
            .map(normalizeQuestPlaceTarget)
            .filter((place): place is QuestPlaceTarget => place !== null)
        : [];

      return themeLabel && places.length > 0
        ? {
            places,
            themeLabel,
            type: 'completeThemedCollection',
          }
        : null;
    }
    default:
      return null;
  }
}

function normalizeQuest(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): QuestDefinition | null {
  const data = documentSnapshot.data() as FirestoreQuest | undefined;

  if (!data) {
    return null;
  }

  const id =
    typeof data.questId === 'string' && data.questId.trim() ? data.questId.trim() : documentSnapshot.id;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const type =
    data.type === 'visitSpecificPlaces' ||
    data.type === 'visitPlacesInRegion' ||
    data.type === 'completeThemedCollection'
      ? data.type
      : null;
  const status: QuestStatus = data.status === 'archived' ? 'archived' : 'active';
  const objective = normalizeQuestObjective(data.objective);
  const reward = normalizeQuestReward(data.reward);

  if (!id || !title || !description || !type || !objective || !reward) {
    return null;
  }

  return {
    configVersion:
      typeof data.configVersion === 'string' && data.configVersion.trim()
        ? data.configVersion.trim()
        : '',
    description,
    id,
    imageUrl: typeof data.imageUrl === 'string' && data.imageUrl.trim() ? data.imageUrl : null,
    objective,
    reward,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    status,
    title,
    type,
  };
}

export function subscribeToQuests(options: {
  onError: (message: string) => void;
  onSuccess: (quests: QuestDefinition[]) => void;
}) {
  if (!isFirebaseConfigured()) {
    options.onSuccess([...SAMPLE_QUESTS]);
    return () => undefined;
  }

  const questsQuery = query(
    collection(getFirebaseFirestore(), QUESTS_COLLECTION_NAME),
    where('status', '==', 'active'),
  );

  return onSnapshot(
    questsQuery,
    snapshot => {
      const quests = snapshot.docs
        .map(normalizeQuest)
        .filter((quest: QuestDefinition | null): quest is QuestDefinition => quest !== null)
        .sort(
          (left: QuestDefinition, right: QuestDefinition) =>
            left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
        );

      options.onSuccess(quests.length > 0 ? quests : [...SAMPLE_QUESTS]);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe quests failed',
        {
          operation: 'onSnapshot',
          path: QUESTS_COLLECTION_NAME,
        },
        error,
      );
      options.onError(
        error instanceof Error ? error.message : 'Unable to load quests from Firestore.',
      );
      options.onSuccess([...SAMPLE_QUESTS]);
    },
  );
}
