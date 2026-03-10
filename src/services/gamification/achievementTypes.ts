import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import type { PlaceMapItem } from '../../features/map/types';
import type { UserPlaceState } from '../../features/userPlace/types';

export const USER_ACHIEVEMENTS_SUBCOLLECTION_NAME = 'achievements';
export const ACHIEVEMENT_CONFIG_VERSION = '2026-03-10';

export type AchievementCategory =
  | 'collection'
  | 'contribution'
  | 'exploration'
  | 'quest';

export type AchievementIcon =
  | 'camera'
  | 'compass'
  | 'map'
  | 'map-pin'
  | 'scroll'
  | 'trophy';

export type AchievementEvaluationMode = 'backend' | 'client' | 'hybrid';
export type AchievementUnlockSource = 'client' | 'firebase-function';

export type AchievementCriterion =
  | {
      count: number;
      type: 'collectedPlacesCount';
    }
  | {
      count: number;
      type: 'completedQuestsCount';
    }
  | {
      count: number;
      type: 'uploadedPhotosCount';
    }
  | {
      count: number;
      type: 'visitedPlacesCount';
    }
  | {
      minPlacesPerRegion: number;
      type: 'visitedPlaceInEveryRegion';
    };

export type AchievementDefinition = {
  category: AchievementCategory;
  configVersion: string;
  criteria: AchievementCriterion;
  description: string;
  evaluationMode: AchievementEvaluationMode;
  icon: AchievementIcon;
  id: string;
  title: string;
  xpReward: number;
};

export type AchievementStats = {
  completedQuestsCount: number;
  uploadedPhotosCount: number;
};

export type AchievementEvaluationContext = {
  placeStates: UserPlaceState[];
  places: PlaceMapItem[];
  stats: AchievementStats;
};

export type AchievementProgress = {
  complete: boolean;
  current: number;
  label: string;
  target: number;
};

export type AchievementEvaluationState = {
  definition: AchievementDefinition;
  isUnlocked: boolean;
  progress: AchievementProgress;
};

export type AchievementUnlockDraft = {
  achievementId: string;
  category: AchievementCategory;
  configVersion: string;
  description: string;
  icon: AchievementIcon;
  title: string;
  unlockedAtMs: number;
  xpReward: number;
};

export type AchievementEvaluationResult = {
  states: AchievementEvaluationState[];
  unlocks: AchievementUnlockDraft[];
};

export type UserAchievement = {
  achievementId: string;
  category: AchievementCategory;
  configVersion: string;
  description: string;
  icon: AchievementIcon;
  title: string;
  unlockedAtMs: number;
  unlockedBy: AchievementUnlockSource;
  xpReward: number;
};

export type FirestoreUserAchievement = {
  achievementId: string;
  category?: AchievementCategory;
  configVersion?: string;
  description?: string;
  icon?: AchievementIcon;
  title?: string;
  unlockedAt?: FirebaseFirestoreTypes.Timestamp | null;
  unlockedBy?: AchievementUnlockSource;
  xpReward?: number;
};

export function createDefaultAchievementStats(): AchievementStats {
  return {
    completedQuestsCount: 0,
    uploadedPhotosCount: 0,
  };
}
