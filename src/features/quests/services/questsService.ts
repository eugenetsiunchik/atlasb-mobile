import {
  collection,
  onSnapshot,
  query,
  where,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  getFirebaseFirestore,
  getFirebaseFunctions,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import { SAMPLE_QUESTS } from '../sampleQuests';
import {
  QUEST_CONFIG_VERSION,
  QUESTS_COLLECTION_NAME,
  type FirestoreQuest,
  type QuestDefinition,
  type QuestObjective,
  type QuestPlaceMatcher,
  type QuestPlaceTarget,
  type QuestReward,
  type QuestStatus,
  type QuestType,
  type UserQuestProgress,
} from '../types';
import type { AchievementUnlockDraft } from '../../../services/gamification';

type TimestampLike = {
  toMillis: () => number;
};

type BackendQuestAssignmentSlot = 'daily_easy' | 'daily_personalized' | 'weekly_stretch';
type BackendQuestObjective =
  | {
      placeIds?: unknown;
      type: 'specific_places';
    }
  | {
      regionId?: unknown;
      requiredVisits?: unknown;
      type: 'region_places_count';
    }
  | {
      placeIds?: unknown;
      requiredPlaces?: unknown;
      themeId?: unknown;
      type: 'themed_collection';
    }
  | {
      requiredCount?: unknown;
      type: 'contribution_count';
    }
  | {
      requiredCount?: unknown;
      type: 'verification_count';
    }
  | {
      requiredDays?: unknown;
      type: 'streak_days';
    };

type BackendUserQuestAssignment = {
  allowSkip?: unknown;
  assignmentId?: unknown;
  completedAt?: unknown;
  completedUnitIds?: unknown;
  description?: unknown;
  expiresAt?: unknown;
  objective?: unknown;
  progressCount?: unknown;
  reward?: {
    xp?: unknown;
  } | null;
  rewardProcessedAt?: unknown;
  slot?: unknown;
  status?: unknown;
  targetCount?: unknown;
  templateId?: unknown;
  title?: unknown;
  updatedAt?: unknown;
};

type BackendQuestSnapshotResponse = {
  assignments?: unknown;
};

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === 'string')
        .map(entry => entry.trim())
        .filter(Boolean)
    : [];
}

function readTimestampMs(value: unknown) {
  return value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function'
    ? (value as TimestampLike).toMillis()
    : null;
}

function createPlaceTargets(placeIds: string[]) {
  return placeIds.map(placeId => ({
    id: placeId,
    label: placeId,
    matcher: {
      placeId,
    },
  }));
}

function normalizeAssignmentObjective(value: unknown): {
  objective: QuestObjective;
  type: QuestType;
} | null {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return null;
  }

  switch ((value as BackendQuestObjective).type) {
    case 'specific_places': {
      const placeIds = normalizeStringArray(value.placeIds);
      if (placeIds.length === 0) {
        return null;
      }

      return {
        objective: {
          places: createPlaceTargets(placeIds),
          type: 'visitSpecificPlaces',
        },
        type: 'visitSpecificPlaces',
      };
    }
    case 'region_places_count': {
      const regionId = typeof value.regionId === 'string' ? value.regionId.trim() : '';
      const requiredVisits =
        typeof value.requiredVisits === 'number' ? Math.max(1, Math.floor(value.requiredVisits)) : 0;
      if (!regionId || requiredVisits === 0) {
        return null;
      }

      return {
        objective: {
          region: regionId,
          requiredCount: requiredVisits,
          type: 'visitPlacesInRegion',
        },
        type: 'visitPlacesInRegion',
      };
    }
    case 'themed_collection': {
      const themeId = typeof value.themeId === 'string' ? value.themeId.trim() : '';
      const requiredPlaces =
        typeof value.requiredPlaces === 'number' ? Math.max(1, Math.floor(value.requiredPlaces)) : 0;
      const placeIds = normalizeStringArray(value.placeIds);
      if (!themeId || requiredPlaces === 0 || placeIds.length === 0) {
        return null;
      }

      return {
        objective: {
          places: createPlaceTargets(placeIds),
          themeLabel: themeId,
          type: 'completeThemedCollection',
        },
        type: 'completeThemedCollection',
      };
    }
    case 'contribution_count': {
      const requiredCount =
        typeof value.requiredCount === 'number' ? Math.max(1, Math.floor(value.requiredCount)) : 0;
      return requiredCount > 0
        ? {
            objective: {
              requiredCount,
              type: 'contributionCount',
            },
            type: 'contributionCount',
          }
        : null;
    }
    case 'verification_count': {
      const requiredCount =
        typeof value.requiredCount === 'number' ? Math.max(1, Math.floor(value.requiredCount)) : 0;
      return requiredCount > 0
        ? {
            objective: {
              requiredCount,
              type: 'verificationCount',
            },
            type: 'verificationCount',
          }
        : null;
    }
    case 'streak_days': {
      const requiredDays =
        typeof value.requiredDays === 'number' ? Math.max(1, Math.floor(value.requiredDays)) : 0;
      return requiredDays > 0
        ? {
            objective: {
              requiredDays,
              type: 'streakDays',
            },
            type: 'streakDays',
          }
        : null;
    }
    default:
      return null;
  }
}

function getAssignmentSortOrder(slot: BackendQuestAssignmentSlot | null, fallbackIndex: number) {
  switch (slot) {
    case 'daily_easy':
      return 1;
    case 'daily_personalized':
      return 2;
    case 'weekly_stretch':
      return 3;
    default:
      return fallbackIndex + 10;
  }
}

function buildAssignmentProgressLabel(
  objective: QuestObjective,
  currentCount: number,
  targetCount: number,
) {
  switch (objective.type) {
    case 'visitSpecificPlaces':
      return `${currentCount}/${targetCount} required places visited`;
    case 'visitPlacesInRegion':
      return `${currentCount}/${targetCount} places visited in ${objective.region}`;
    case 'completeThemedCollection':
      return `${currentCount}/${targetCount} ${objective.themeLabel} places visited`;
    case 'contributionCount':
      return `${currentCount}/${targetCount} approved contributions`;
    case 'verificationCount':
      return `${currentCount}/${targetCount} verifications`;
    case 'streakDays':
      return `${currentCount}/${targetCount} streak days`;
  }
}

function normalizeQuestAssignment(
  value: unknown,
  fallbackIndex: number,
): {
  progress: UserQuestProgress;
  quest: QuestDefinition;
} | null {
  if (!isRecord(value)) {
    return null;
  }

  const assignment = value as BackendUserQuestAssignment;
  const assignmentId = typeof assignment.assignmentId === 'string' ? assignment.assignmentId.trim() : '';
  const title = typeof assignment.title === 'string' ? assignment.title.trim() : '';
  const description = typeof assignment.description === 'string' ? assignment.description.trim() : '';
  const objective = normalizeAssignmentObjective(assignment.objective);
  const slot = typeof assignment.slot === 'string' ? assignment.slot.trim() : '';
  const status =
    assignment.status === 'completed' ||
    assignment.status === 'in_progress' ||
    assignment.status === 'assigned' ||
    assignment.status === 'expired' ||
    assignment.status === 'skipped' ||
    assignment.status === 'abandoned'
      ? assignment.status
      : 'assigned';
  const currentCount =
    typeof assignment.progressCount === 'number' ? Math.max(0, Math.floor(assignment.progressCount)) : 0;
  const completedUnitIds = normalizeStringArray(assignment.completedUnitIds);
  const rewardXp =
    assignment.reward && typeof assignment.reward.xp === 'number'
      ? Math.max(0, Math.floor(assignment.reward.xp))
      : 0;

  if (!assignmentId || !title || !description || !objective) {
    return null;
  }

  const inferredTargetCount =
    objective.objective.type === 'visitSpecificPlaces'
      ? objective.objective.places.length
      : objective.objective.type === 'visitPlacesInRegion'
        ? objective.objective.requiredCount
        : objective.objective.type === 'completeThemedCollection'
          ? objective.objective.places.length
          : objective.objective.type === 'streakDays'
            ? objective.objective.requiredDays
            : objective.objective.requiredCount;
  const targetCount =
    typeof assignment.targetCount === 'number' ? Math.max(1, Math.floor(assignment.targetCount)) : inferredTargetCount;
  const progress: UserQuestProgress = {
    completedAtMs: readTimestampMs(assignment.completedAt),
    currentCount: Math.min(currentCount, targetCount),
    matchedPlaceIds:
      objective.objective.type === 'visitSpecificPlaces' ||
      objective.objective.type === 'visitPlacesInRegion' ||
      objective.objective.type === 'completeThemedCollection'
        ? completedUnitIds
        : [],
    matchedTargetIds:
      objective.objective.type === 'visitSpecificPlaces' ||
      objective.objective.type === 'visitPlacesInRegion' ||
      objective.objective.type === 'completeThemedCollection'
        ? completedUnitIds
        : [],
    progressLabel: buildAssignmentProgressLabel(
      objective.objective,
      Math.min(currentCount, targetCount),
      targetCount,
    ),
    questId: assignmentId,
    rewardAchievementIds: [],
    rewardAppliedAtMs: readTimestampMs(assignment.rewardProcessedAt),
    rewardXp,
    status: status === 'completed' ? 'completed' : 'active',
    targetCount,
    updatedAtMs: readTimestampMs(assignment.updatedAt),
  };

  return {
    progress,
    quest: {
      configVersion:
        typeof assignment.templateId === 'string' && assignment.templateId.trim()
          ? assignment.templateId.trim()
          : QUEST_CONFIG_VERSION,
      description,
      id: assignmentId,
      imageUrl: null,
      objective: objective.objective,
      reward: {
        achievementUnlocks: [],
        xp: rewardXp,
      },
      sortOrder: getAssignmentSortOrder(
        slot === 'daily_easy' || slot === 'daily_personalized' || slot === 'weekly_stretch'
          ? slot
          : null,
        fallbackIndex,
      ),
      status: 'active',
      title,
      type: objective.type,
    },
  };
}

async function callQuestFunction<RequestData, ResponseData>(
  name: string,
  data?: RequestData,
): Promise<ResponseData> {
  try {
    const callable = getFirebaseFunctions().httpsCallable<RequestData, ResponseData>(name, {
      timeout: 15000,
    });
    const result = await callable(data ?? null);
    return result.data;
  } catch (error) {
    logFirebaseError(
      `Firebase callable ${name} failed`,
      {
        functionName: name,
        operation: 'httpsCallable',
      },
      error,
    );
    throw error;
  }
}

export async function fetchMyQuestSnapshot() {
  return callQuestFunction<Record<string, never>, BackendQuestSnapshotResponse>('getMyQuestSnapshot', {});
}

export async function generateQuestAssignments() {
  return callQuestFunction<Record<string, never>, { assignments?: unknown; createdCount?: unknown }>(
    'refreshMyQuestAssignments',
    {},
  );
}

export async function loadQuestSnapshotWithGeneration(): Promise<{
  progress: UserQuestProgress[];
  quests: QuestDefinition[];
}> {
  if (!isFirebaseConfigured()) {
    return {
      progress: [],
      quests: [...SAMPLE_QUESTS],
    };
  }

  let snapshot = await fetchMyQuestSnapshot();
  let assignments = Array.isArray(snapshot.assignments) ? snapshot.assignments : [];

  if (assignments.length === 0) {
    await generateQuestAssignments();
    snapshot = await fetchMyQuestSnapshot();
    assignments = Array.isArray(snapshot.assignments) ? snapshot.assignments : [];
  }

  const normalized = assignments
    .map((assignment, index) => normalizeQuestAssignment(assignment, index))
    .filter(
      (
        value,
      ): value is {
        progress: UserQuestProgress;
        quest: QuestDefinition;
      } => value !== null,
    )
    .sort((left, right) => left.quest.sortOrder - right.quest.sortOrder);

  return {
    progress: normalized.map(entry => entry.progress),
    quests: normalized.map(entry => entry.quest),
  };
}

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
