import {
  ACHIEVEMENT_DEFINITIONS,
  buildAchievementEvaluationContext,
  createDefaultAchievementStats,
  evaluateAchievementDefinitions,
} from '../services/gamification';
import { applyAchievementUnlocks } from '../services/gamification/userAchievementsService';
import { selectAllMapPlaces } from '../features/map/store';
import { selectAllUserPlaceStates } from '../features/userPlace/store';
import { selectAuthProfile, selectCurrentUser } from './auth';
import type { AppThunk } from './store';
import { selectUnlockedAchievementIds } from './achievementSelectors';
import { authActions } from './auth';

export const evaluateAchievements =
  (): AppThunk<Promise<{ status: 'fulfilled'; unlockedCount: number } | { status: 'skipped' }>> =>
  async (dispatch, getState) => {
    const state = getState();
    const currentUser = selectCurrentUser(state);
    const profile = selectAuthProfile(state);

    if (!currentUser || !profile) {
      return { status: 'skipped' };
    }

    const evaluation = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates: selectAllUserPlaceStates(state),
        places: selectAllMapPlaces(state),
        stats: createDefaultAchievementStats(),
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      unlockedAchievementIds: selectUnlockedAchievementIds(state),
    });

    if (evaluation.unlocks.length === 0) {
      return {
        status: 'fulfilled',
        unlockedCount: 0,
      };
    }

    const writeResult = await applyAchievementUnlocks({
      currentXp: profile.xp,
      source: 'client',
      uid: currentUser.uid,
      unlocks: evaluation.unlocks,
    });

    dispatch(
      authActions.authProfilePatched({
        level: writeResult.nextLevel,
        xp: writeResult.nextXp,
      }),
    );

    return {
      status: 'fulfilled',
      unlockedCount: evaluation.unlocks.length,
    };
  };
