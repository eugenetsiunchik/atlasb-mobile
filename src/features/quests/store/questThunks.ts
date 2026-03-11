import { authActions, selectAuthProfile, selectCurrentUser } from '../../../store/auth';
import { selectAllMapPlaces } from '../../map/store';
import { selectAllUserPlaceStates } from '../../userPlace/store';
import { applyQuestProgressEvaluations } from '../services/userQuestProgressService';
import { evaluateQuestProgress, hasQuestProgressChanged } from '../progressHelpers';
import type { QuestDefinition } from '../types';
import type { AppThunk } from '../../../store/store';
import { selectUnlockedAchievementIds } from '../../../store/achievementSelectors';
import {
  selectAllQuests,
  selectQuestProgressByQuestId,
} from './questSelectors';
import { questsActions } from './questsSlice';

export const evaluateQuestProgressThunk =
  (): AppThunk<
    Promise<
      | { rewardAppliedCount: number; status: 'fulfilled'; syncedCount: number }
      | { message: string; status: 'failed' }
      | { status: 'skipped' }
    >
  > =>
  async dispatch => {
    return dispatch(syncQuestProgress());
  };

export const syncQuestProgress =
  (): AppThunk<
    Promise<
      | { rewardAppliedCount: number; status: 'fulfilled'; syncedCount: number }
      | { message: string; status: 'failed' }
      | { status: 'skipped' }
    >
  > =>
  async (dispatch, getState) => {
    const state = getState();
    const currentUser = selectCurrentUser(state);
    const profile = selectAuthProfile(state);

    if (!currentUser?.uid || !profile) {
      return { status: 'skipped' };
    }

    const quests = selectAllQuests(state).filter(quest => quest.status === 'active');
    const progressByQuestId = selectQuestProgressByQuestId(state);
    const evaluations = quests.map(quest =>
      evaluateQuestProgress({
        placeStates: selectAllUserPlaceStates(state),
        places: selectAllMapPlaces(state),
        previousProgress: progressByQuestId[quest.id] ?? null,
        quest,
      }),
    );
    const changedEvaluations = evaluations.filter(
      evaluation =>
        evaluation.shouldApplyRewards ||
        hasQuestProgressChanged(progressByQuestId[evaluation.questId] ?? null, evaluation),
    );

    if (changedEvaluations.length === 0) {
      return {
        rewardAppliedCount: 0,
        status: 'fulfilled',
        syncedCount: 0,
      };
    }

    const questsById = Object.fromEntries(
      quests.map(quest => [quest.id, quest] satisfies [string, QuestDefinition]),
    );
    let writeResult: Awaited<ReturnType<typeof applyQuestProgressEvaluations>>;

    try {
      writeResult = await applyQuestProgressEvaluations({
        currentXp: profile.xp,
        evaluations: changedEvaluations,
        questsById,
        uid: currentUser.uid,
        unlockedAchievementIds: selectUnlockedAchievementIds(state),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to sync quest progress with Firestore.';
      dispatch(questsActions.questProgressLoadFailed(message));
      return {
        message,
        status: 'failed' as const,
      };
    }

    dispatch(questsActions.questProgressUpserted(writeResult.progresses));

    if (writeResult.rewardAppliedCount > 0) {
      dispatch(
        authActions.authProfilePatched({
          level: writeResult.nextLevel,
          xp: writeResult.nextXp,
        }),
      );
    }

    return {
      rewardAppliedCount: writeResult.rewardAppliedCount,
      status: 'fulfilled',
      syncedCount: changedEvaluations.length,
    };
  };
