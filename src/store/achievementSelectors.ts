import { createSelector } from '@reduxjs/toolkit';

import { selectAllMapPlaces } from '../features/map/store';
import { selectCompletedQuestCount } from '../features/quests';
import { selectAllUserPlaceStates } from '../features/userPlace/store';
import {
  ACHIEVEMENT_DEFINITIONS,
  buildAchievementEvaluationContext,
  createDefaultAchievementStats,
  evaluateAchievementDefinitions,
} from '../services/gamification';
import type { RootState } from './store';
import { userAchievementsAdapterSelectors } from './achievementsSlice';

const achievementsSelectors = userAchievementsAdapterSelectors.getSelectors<RootState>(
  state => state.achievements,
);

export const selectAchievementsState = (state: RootState) => state.achievements;
export const selectAllUnlockedAchievements = achievementsSelectors.selectAll;
export const selectAchievementsError = (state: RootState) => state.achievements.error;
export const selectAchievementsStatus = (state: RootState) => state.achievements.status;
export const selectUnlockedAchievementIds = createSelector(
  [selectAllUnlockedAchievements],
  achievements => achievements.map(achievement => achievement.achievementId),
);
export const selectAchievementCards = createSelector(
  [
    selectAllUnlockedAchievements,
    selectAllUserPlaceStates,
    selectAllMapPlaces,
    selectCompletedQuestCount,
  ],
  (unlockedAchievements, userPlaceStates, places, completedQuestCount) => {
    const unlockedAchievementsById = new Map(
      unlockedAchievements.map(achievement => [achievement.achievementId, achievement]),
    );
    const evaluation = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates: userPlaceStates,
        places,
        stats: {
          ...createDefaultAchievementStats(),
          completedQuestsCount: completedQuestCount,
        },
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      unlockedAchievementIds: unlockedAchievementsById.keys(),
    });
    const configuredCards = evaluation.states.map(state => {
      const unlockedAchievement = unlockedAchievementsById.get(state.definition.id);

      return {
        ...state.definition,
        isUnlocked: state.isUnlocked,
        progress: state.progress,
        unlockedAtMs: unlockedAchievement?.unlockedAtMs ?? null,
        unlockedBy: unlockedAchievement?.unlockedBy ?? null,
      };
    });
    const configuredIds = new Set(configuredCards.map(card => card.id));
    const extraUnlockedCards = unlockedAchievements
      .filter(achievement => !configuredIds.has(achievement.achievementId))
      .sort((left, right) => right.unlockedAtMs - left.unlockedAtMs)
      .map(achievement => ({
        category: achievement.category,
        configVersion: achievement.configVersion,
        description: achievement.description,
        evaluationMode: 'backend' as const,
        icon: achievement.icon,
        id: achievement.achievementId,
        isUnlocked: true,
        progress: {
          complete: true,
          current: 1,
          label: 'Unlocked from a quest reward',
          target: 1,
        },
        title: achievement.title,
        unlockedAtMs: achievement.unlockedAtMs,
        unlockedBy: achievement.unlockedBy,
        xpReward: achievement.xpReward,
      }));

    return [...extraUnlockedCards, ...configuredCards];
  },
);
export const selectAchievementsSummary = createSelector(
  [selectAchievementCards],
  achievementCards => {
    const unlockedCount = achievementCards.filter(card => card.isUnlocked).length;
    const totalCount = achievementCards.length;
    const earnedXp = achievementCards
      .filter(card => card.isUnlocked)
      .reduce((sum, card) => sum + card.xpReward, 0);
    const nextLockedAchievement = achievementCards.find(card => !card.isUnlocked) ?? null;

    return {
      earnedXp,
      nextLockedAchievement,
      totalCount,
      unlockedCount,
    };
  },
);
