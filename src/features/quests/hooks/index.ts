import React from 'react';

import {
  useAppDispatch,
  useAppSelector,
  selectCurrentUser,
  selectAuthProfile,
} from '../../../store';
import {
  selectAllMapPlaces,
  selectMapPlacesStatus,
} from '../../map/store';
import {
  selectAllUserPlaceStates,
  selectUserPlaceStatesStatus,
} from '../../userPlace';
import {
  loadQuestSnapshotWithGeneration,
  subscribeToQuests,
} from '../services/questsService';
import {
  selectAllQuests,
  selectAllQuestProgress,
  selectQuestSyncSource,
  selectQuestsStatus,
  selectQuestProgressStatus,
} from '../store';
import { syncQuestProgress } from '../store';
import { questsActions } from '../store';

function buildQuestEvaluationKey(params: {
  placeStates: ReturnType<typeof selectAllUserPlaceStates>;
  places: ReturnType<typeof selectAllMapPlaces>;
  progress: ReturnType<typeof selectAllQuestProgress>;
  quests: ReturnType<typeof selectAllQuests>;
}) {
  const questKey = params.quests
    .map(quest => `${quest.id}:${quest.type}:${quest.status}`)
    .join('|');
  const placeKey = params.places
    .map(place => `${place.id}:${place.region}`)
    .sort()
    .join('|');
  const placeStateKey = params.placeStates
    .map(placeState => `${placeState.placeId}:${placeState.visited ? 1 : 0}`)
    .sort()
    .join('|');
  const progressKey = params.progress
    .map(
      progress =>
        `${progress.questId}:${progress.status}:${progress.currentCount}:${progress.rewardAppliedAtMs ?? 0}`,
    )
    .sort()
    .join('|');

  return `${questKey}::${placeKey}::${placeStateKey}::${progressKey}`;
}

export function useQuestsSync() {
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (currentUser?.uid) {
      dispatch(questsActions.questSyncSourceSet('serverSnapshot'));
      dispatch(questsActions.questsLoadingStarted());
      dispatch(questsActions.questProgressLoadingStarted());

      let isCancelled = false;

      void loadQuestSnapshotWithGeneration()
        .then(({ progress, quests }) => {
          if (isCancelled) {
            return;
          }

          dispatch(questsActions.questsReceived(quests));
          dispatch(questsActions.questProgressReceived(progress));
        })
        .catch(error => {
          if (isCancelled) {
            return;
          }

          const message =
            error instanceof Error ? error.message : 'Unable to load quests from Cloud Functions.';
          dispatch(questsActions.questsLoadFailed(message));
          dispatch(questsActions.questProgressLoadFailed(message));
        });

      return () => {
        isCancelled = true;
      };
    }

    dispatch(questsActions.questSyncSourceSet('localEvaluation'));
    dispatch(questsActions.questsLoadingStarted());

    return subscribeToQuests({
      onError: message => {
        dispatch(questsActions.questsLoadFailed(message));
      },
      onSuccess: quests => {
        dispatch(questsActions.questsReceived(quests));
      },
    });
  }, [currentUser?.uid, dispatch]);

  React.useEffect(() => {
    if (!currentUser?.uid) {
      dispatch(questsActions.questProgressCleared());
    }
  }, [currentUser?.uid, dispatch]);
}

export function useQuestProgressEvaluation() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const profile = useAppSelector(selectAuthProfile);
  const quests = useAppSelector(selectAllQuests);
  const progress = useAppSelector(selectAllQuestProgress);
  const placeStates = useAppSelector(selectAllUserPlaceStates);
  const places = useAppSelector(selectAllMapPlaces);
  const questsStatus = useAppSelector(selectQuestsStatus);
  const progressStatus = useAppSelector(selectQuestProgressStatus);
  const questSyncSource = useAppSelector(selectQuestSyncSource);
  const mapPlacesStatus = useAppSelector(selectMapPlacesStatus);
  const userPlaceStatesStatus = useAppSelector(selectUserPlaceStatesStatus);
  const evaluationKey = React.useMemo(
    () =>
      buildQuestEvaluationKey({
        placeStates,
        places,
        progress,
        quests,
      }),
    [placeStates, places, progress, quests],
  );

  React.useEffect(() => {
    if (
      !currentUser?.uid ||
      !profile ||
      questSyncSource === 'serverSnapshot' ||
      questsStatus !== 'ready' ||
      progressStatus !== 'ready' ||
      mapPlacesStatus !== 'ready' ||
      userPlaceStatesStatus !== 'ready'
    ) {
      return;
    }

    void dispatch(syncQuestProgress());
  }, [
    currentUser?.uid,
    dispatch,
    evaluationKey,
    mapPlacesStatus,
    profile,
    progressStatus,
    questSyncSource,
    questsStatus,
    userPlaceStatesStatus,
  ]);
}
