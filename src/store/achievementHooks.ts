import React from 'react';

import { selectAllMapPlaces } from '../features/map/store';
import { selectCompletedQuestIds } from '../features/quests';
import { selectAllUserPlaceStates } from '../features/userPlace/store';
import { subscribeToUserAchievements } from '../services/gamification/userAchievementsService';
import { useAppDispatch, useAppSelector } from './hooks';
import { achievementsActions } from './achievementsSlice';
import { selectAchievementsStatus, selectUnlockedAchievementIds } from './achievementSelectors';
import { evaluateAchievements } from './achievementThunks';
import { selectAuthProfile, selectCurrentUser } from './auth';

function buildEvaluationKey(params: {
  completedQuestIds: string[];
  placeIdsByRegion: string[];
  placeStates: ReturnType<typeof selectAllUserPlaceStates>;
  profileXp: number;
  unlockedAchievementIds: string[];
}) {
  const placeStateKey = params.placeStates
    .map(
      placeState =>
        `${placeState.placeId}:${placeState.visited ? 1 : 0}:${placeState.collected ? 1 : 0}`,
    )
    .sort()
    .join('|');
  const placeRegionKey = params.placeIdsByRegion.sort().join('|');
  const completedQuestKey = [...params.completedQuestIds].sort().join('|');
  const unlockedKey = [...params.unlockedAchievementIds].sort().join('|');

  return `${params.profileXp}::${placeStateKey}::${placeRegionKey}::${completedQuestKey}::${unlockedKey}`;
}

export function useUserAchievementsSync() {
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (!currentUser?.uid) {
      dispatch(achievementsActions.achievementsCleared());
      return;
    }

    dispatch(achievementsActions.achievementsLoadingStarted());

    return subscribeToUserAchievements(currentUser.uid, {
      onError: message => {
        dispatch(achievementsActions.achievementsLoadFailed(message));
      },
      onSuccess: achievements => {
        dispatch(achievementsActions.achievementsReceived(achievements));
      },
    });
  }, [currentUser?.uid, dispatch]);
}

export function useAchievementEvaluation() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const profile = useAppSelector(selectAuthProfile);
  const achievementsStatus = useAppSelector(selectAchievementsStatus);
  const completedQuestIds = useAppSelector(selectCompletedQuestIds);
  const unlockedAchievementIds = useAppSelector(selectUnlockedAchievementIds);
  const userPlaceStates = useAppSelector(selectAllUserPlaceStates);
  const places = useAppSelector(selectAllMapPlaces);
  const evaluationKey = React.useMemo(
    () =>
      buildEvaluationKey({
        completedQuestIds,
        placeIdsByRegion: places.map(place => `${place.id}:${place.region}`),
        placeStates: userPlaceStates,
        profileXp: profile?.xp ?? 0,
        unlockedAchievementIds,
      }),
    [completedQuestIds, places, profile?.xp, unlockedAchievementIds, userPlaceStates],
  );

  React.useEffect(() => {
    if (!currentUser?.uid || !profile || achievementsStatus !== 'ready') {
      return;
    }

    void dispatch(evaluateAchievements());
  }, [achievementsStatus, currentUser?.uid, dispatch, evaluationKey, profile]);
}
