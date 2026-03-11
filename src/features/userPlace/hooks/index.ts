import React from 'react';

import { requireAuthForAction } from '../../../services/auth';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import { subscribeToUserPlaceStates } from '../services/userPlaceStatesService';
import {
  makeSelectResolvedUserPlaceState,
  runUserPlaceMutation,
  selectIsUserPlaceMutationPendingForPlace,
  userPlaceStatesActions,
} from '../store';
import type { UserPlaceMutation } from '../types';

function useRunGuardedUserPlaceMutation(
  placeId: string,
  mutation: UserPlaceMutation,
) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isPending = useAppSelector(state =>
    selectIsUserPlaceMutationPendingForPlace(state, placeId),
  );

  const runMutation = React.useCallback(async () => {
    if (!requireAuthForAction('userPlaceState')) {
      return {
        reason: 'auth-required' as const,
        status: 'skipped' as const,
      };
    }

    return dispatch(
      runUserPlaceMutation({
        mutation,
        placeId,
      }),
    );
  }, [dispatch, mutation, placeId]);

  return {
    isPending,
    requiresAuth: !isAuthenticated,
    runMutation,
  };
}

export function useUserPlaceStatesSync() {
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (!currentUser?.uid) {
      dispatch(userPlaceStatesActions.userPlaceStatesCleared());
      return;
    }

    dispatch(userPlaceStatesActions.userPlaceStatesLoadingStarted());

    return subscribeToUserPlaceStates(currentUser.uid, {
      onError: message => {
        dispatch(userPlaceStatesActions.userPlaceStatesLoadFailed(message));
      },
      onSuccess: userPlaceStates => {
        dispatch(userPlaceStatesActions.userPlaceStatesReceived(userPlaceStates));
      },
    });
  }, [currentUser?.uid, dispatch]);
}

export function useUserPlaceState(placeId: string) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const selectResolvedUserPlaceState = React.useMemo(
    makeSelectResolvedUserPlaceState,
    [],
  );
  const resolvedUserPlaceState = useAppSelector(state =>
    selectResolvedUserPlaceState(state, placeId),
  );

  return React.useMemo(
    () => ({
      ...resolvedUserPlaceState,
      canMutate: isAuthenticated,
      requiresAuth: !isAuthenticated,
    }),
    [isAuthenticated, resolvedUserPlaceState],
  );
}

export function useToggleSavePlace(placeId: string) {
  const { isPending, requiresAuth, runMutation } = useRunGuardedUserPlaceMutation(
    placeId,
    'toggleSave',
  );

  return React.useMemo(
    () => ({
      isPending,
      requiresAuth,
      toggleSavePlace: runMutation,
    }),
    [isPending, requiresAuth, runMutation],
  );
}

export function useMarkVisited(placeId: string) {
  const { isPending, requiresAuth, runMutation } = useRunGuardedUserPlaceMutation(
    placeId,
    'markVisited',
  );

  return React.useMemo(
    () => ({
      isPending,
      markVisited: runMutation,
      requiresAuth,
    }),
    [isPending, requiresAuth, runMutation],
  );
}

export { usePlaceVisitCheckIn } from './usePlaceVisitCheckIn';
