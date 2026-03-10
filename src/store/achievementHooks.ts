import React from 'react';

import { selectAllMapPlaces } from '../features/map/store';
import { selectAllUserPlaceStates } from '../features/userPlace/store';
import { subscribeToUserAchievements } from '../services/gamification/userAchievementsService';
import { useAppDispatch, useAppSelector } from './hooks';
import { achievementsActions } from './achievementsSlice';
import { selectAchievementsStatus, selectUnlockedAchievementIds } from './achievementSelectors';
import { evaluateAchievements } from './achievementThunks';
import { selectAuthProfile, selectCurrentUser } from './auth';

function buildEvaluationKey(params: {
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
  const unlockedKey = [...params.unlockedAchievementIds].sort().join('|');

  return `${params.profileXp}::${placeStateKey}::${placeRegionKey}::${unlockedKey}`;
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
  const unlockedAchievementIds = useAppSelector(selectUnlockedAchievementIds);
  const userPlaceStates = useAppSelector(selectAllUserPlaceStates);
  const places = useAppSelector(selectAllMapPlaces);
  const evaluationKey = React.useMemo(
    () =>
      buildEvaluationKey({
        placeIdsByRegion: places.map(place => `${place.id}:${place.region}`),
        placeStates: userPlaceStates,
        profileXp: profile?.xp ?? 0,
        unlockedAchievementIds,
      }),
    [places, profile?.xp, unlockedAchievementIds, userPlaceStates],
  );

  React.useEffect(() => {
    if (!currentUser?.uid || !profile || achievementsStatus !== 'ready') {
      return;
    }

    void dispatch(evaluateAchievements());
  }, [achievementsStatus, currentUser?.uid, dispatch, evaluationKey, profile]);
}
