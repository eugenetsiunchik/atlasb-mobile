import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import type { PlaceMapItem } from '../map/types';
import type { UserPlaceState } from '../userPlace';
import type { AchievementUnlockDraft } from '../../services/gamification';

export const QUESTS_COLLECTION_NAME = 'quests';
export const USER_QUEST_PROGRESS_SUBCOLLECTION_NAME = 'questProgress';
export const QUEST_CONFIG_VERSION = '2026-03-10';

export type QuestStatus = 'active' | 'archived';
export type QuestType =
  | 'visitSpecificPlaces'
  | 'visitPlacesInRegion'
  | 'completeThemedCollection'
  | 'contributionCount'
  | 'verificationCount'
  | 'streakDays';

export type QuestPlaceMatcher = {
  nameEquals?: string;
  nameIncludes?: string;
  placeId?: string;
  region?: string;
};

export type QuestPlaceTarget = {
  id: string;
  label: string;
  matcher: QuestPlaceMatcher;
};

export type VisitSpecificPlacesQuestObjective = {
  places: QuestPlaceTarget[];
  type: 'visitSpecificPlaces';
};

export type VisitPlacesInRegionQuestObjective = {
  region: string;
  requiredCount: number;
  type: 'visitPlacesInRegion';
};

export type CompleteThemedCollectionQuestObjective = {
  places: QuestPlaceTarget[];
  themeLabel: string;
  type: 'completeThemedCollection';
};

export type ContributionCountQuestObjective = {
  requiredCount: number;
  type: 'contributionCount';
};

export type VerificationCountQuestObjective = {
  requiredCount: number;
  type: 'verificationCount';
};

export type StreakDaysQuestObjective = {
  requiredDays: number;
  type: 'streakDays';
};

export type QuestObjective =
  | VisitSpecificPlacesQuestObjective
  | VisitPlacesInRegionQuestObjective
  | CompleteThemedCollectionQuestObjective
  | ContributionCountQuestObjective
  | VerificationCountQuestObjective
  | StreakDaysQuestObjective;

export type QuestReward = {
  achievementUnlocks: AchievementUnlockDraft[];
  xp: number;
};

export type QuestDefinition = {
  configVersion: string;
  description: string;
  id: string;
  imageUrl: string | null;
  reward: QuestReward;
  sortOrder: number;
  status: QuestStatus;
  title: string;
  type: QuestType;
  objective: QuestObjective;
};

export type FirestoreQuest = {
  configVersion?: string;
  description?: string;
  imageUrl?: string | null;
  objective?: QuestObjective;
  questId?: string;
  reward?: QuestReward;
  sortOrder?: number;
  status?: QuestStatus;
  title?: string;
  type?: QuestType;
};

export type QuestProgressStatus = 'active' | 'completed';

export type UserQuestProgress = {
  completedAtMs: number | null;
  currentCount: number;
  matchedPlaceIds: string[];
  matchedTargetIds: string[];
  progressLabel: string;
  questId: string;
  rewardAchievementIds: string[];
  rewardAppliedAtMs: number | null;
  rewardXp: number;
  status: QuestProgressStatus;
  targetCount: number;
  updatedAtMs: number | null;
};

export type FirestoreUserQuestProgress = {
  completedAt?: FirebaseFirestoreTypes.Timestamp | null;
  currentCount?: number;
  matchedPlaceIds?: string[];
  matchedTargetIds?: string[];
  progressLabel?: string;
  questId?: string;
  rewardAchievementIds?: string[];
  rewardAppliedAt?: FirebaseFirestoreTypes.Timestamp | null;
  rewardXp?: number;
  status?: QuestProgressStatus;
  targetCount?: number;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

export type QuestEvaluationContext = {
  placeStates: UserPlaceState[];
  places: PlaceMapItem[];
  previousProgress: UserQuestProgress | null;
};

export type QuestProgressEvaluation = UserQuestProgress & {
  shouldApplyRewards: boolean;
};

export function createEmptyUserQuestProgress(questId: string): UserQuestProgress {
  return {
    completedAtMs: null,
    currentCount: 0,
    matchedPlaceIds: [],
    matchedTargetIds: [],
    progressLabel: '0/0 complete',
    questId,
    rewardAchievementIds: [],
    rewardAppliedAtMs: null,
    rewardXp: 0,
    status: 'active',
    targetCount: 0,
    updatedAtMs: null,
  };
}
