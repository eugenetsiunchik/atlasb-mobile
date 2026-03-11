import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../store';
import { createEmptyUserQuestProgress } from '../types';
import { questsAdapterSelectors } from './questsSlice';

const questSelectors = questsAdapterSelectors.getSelectors<RootState>(state => state.quests);

export const selectQuestsState = (state: RootState) => state.quests;
export const selectAllQuests = questSelectors.selectAll;
export const selectQuestById = (state: RootState, questId: string) =>
  questSelectors.selectById(state, questId);
export const selectQuestsStatus = (state: RootState) => state.quests.questsStatus;
export const selectQuestsError = (state: RootState) => state.quests.questsError;
export const selectQuestProgressStatus = (state: RootState) => state.quests.progressStatus;
export const selectQuestProgressError = (state: RootState) => state.quests.progressError;
export const selectQuestProgressByQuestId = (state: RootState) => state.quests.progressByQuestId;
export const selectAllQuestProgress = createSelector(
  [selectQuestProgressByQuestId],
  progressByQuestId => Object.values(progressByQuestId),
);
export const selectCompletedQuestIds = createSelector(
  [selectAllQuestProgress],
  progress =>
    progress
      .filter(entry => entry.status === 'completed')
      .map(entry => entry.questId)
      .sort((left, right) => left.localeCompare(right)),
);
export const selectCompletedQuestCount = createSelector(
  [selectCompletedQuestIds],
  completedQuestIds => completedQuestIds.length,
);
export const selectQuestCards = createSelector(
  [selectAllQuests, selectQuestProgressByQuestId],
  (quests, progressByQuestId) =>
    quests.map(quest => {
      const progress = progressByQuestId[quest.id] ?? createEmptyUserQuestProgress(quest.id);

      return {
        ...quest,
        isCompleted: progress.status === 'completed',
        isRewardApplied: progress.rewardAppliedAtMs !== null,
        progress,
      };
    }),
);
export const selectActiveQuestCards = createSelector(
  [selectQuestCards],
  questCards => questCards.filter(quest => !quest.isCompleted),
);
export const selectCompletedQuestCards = createSelector(
  [selectQuestCards],
  questCards =>
    [...questCards]
      .filter(quest => quest.isCompleted)
      .sort(
        (left, right) =>
          (right.progress.completedAtMs ?? 0) - (left.progress.completedAtMs ?? 0),
      ),
);
export const selectQuestCardById = createSelector(
  [
    selectQuestCards,
    (_state: RootState, questId: string | null) => questId,
  ],
  (questCards, questId) => (questId ? questCards.find(quest => quest.id === questId) ?? null : null),
);
export const selectQuestSummary = createSelector(
  [selectQuestCards],
  questCards => {
    const completedCount = questCards.filter(quest => quest.isCompleted).length;
    const totalXp = questCards
      .filter(quest => quest.isRewardApplied)
      .reduce((sum, quest) => sum + quest.reward.xp, 0);

    return {
      activeCount: questCards.length - completedCount,
      completedCount,
      totalCount: questCards.length,
      totalXp,
    };
  },
);
