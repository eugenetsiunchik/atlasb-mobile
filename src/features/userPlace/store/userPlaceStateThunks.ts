import { applyUserPlaceWriteAction } from '../services/userPlaceStatesService';
import {
  createEmptyUserPlaceState,
  hasPersistedUserPlaceState,
  type UserPlaceMutation,
  type UserPlaceMutationResult,
  type UserPlaceState,
  type UserPlaceVisitRecord,
  type UserPlaceWriteAction,
} from '../types';
import {
  selectIsUserPlaceMutationPendingForPlace,
  selectUserPlaceStateById,
} from './userPlaceStateSelectors';
import { userPlaceStatesActions } from './userPlaceStatesSlice';
import { selectCurrentUser } from '../../../store';
import type { AppThunk, RootState } from '../../../store';

type UserPlaceTransition = {
  action: UserPlaceWriteAction;
  nextState: UserPlaceState | null;
};

let userPlaceMutationSequence = 0;

function createUserPlaceMutationRequestId() {
  userPlaceMutationSequence += 1;
  return `user-place-${userPlaceMutationSequence}`;
}

function resolveCurrentUserPlaceState(state: RootState, placeId: string) {
  return selectUserPlaceStateById(state, placeId) ?? createEmptyUserPlaceState(placeId);
}

function resolveTransition(params: {
  currentState: UserPlaceState;
  mutation: UserPlaceMutation;
}): UserPlaceTransition | null {
  const { currentState, mutation } = params;

  switch (mutation) {
    case 'toggleSave': {
      if (currentState.saved) {
        const nextState = {
          ...currentState,
          saved: false,
          savedAtMs: null,
        };

        return {
          action: 'unsave',
          nextState: hasPersistedUserPlaceState(nextState) ? nextState : null,
        };
      }

      return {
        action: 'save',
        nextState: {
          ...currentState,
          saved: true,
          savedAtMs: Date.now(),
          updatedAtMs: Date.now(),
        },
      };
    }
    case 'markDiscovered':
      if (currentState.discovered) {
        return null;
      }

      return {
        action: 'markDiscovered',
        nextState: {
          ...currentState,
          discovered: true,
          discoveredAtMs: Date.now(),
          updatedAtMs: Date.now(),
        },
      };
    case 'markVisited':
      if (currentState.visited) {
        return null;
      }

      return {
        action: 'markVisited',
        nextState: {
          ...currentState,
          visited: true,
          visitedAtMs: Date.now(),
          updatedAtMs: Date.now(),
        },
      };
    case 'markCollected':
      if (currentState.collected) {
        return null;
      }

      return {
        action: 'markCollected',
        nextState: {
          ...currentState,
          collected: true,
          collectedAtMs: Date.now(),
          updatedAtMs: Date.now(),
        },
      };
  }
}

async function commitUserPlaceTransition(params: {
  currentState: UserPlaceState;
  dispatch: (action: unknown) => unknown;
  placeId: string;
  transition: UserPlaceTransition;
  uid: string;
}): Promise<UserPlaceMutationResult> {
  const { currentState, dispatch, placeId, transition, uid } = params;
  const requestId = createUserPlaceMutationRequestId();
  const previousState = hasPersistedUserPlaceState(currentState) ? currentState : null;

  dispatch(
    userPlaceStatesActions.userPlaceMutationOptimisticallyApplied({
      nextState: transition.nextState,
      placeId,
      previousState,
      requestId,
    }),
  );

  try {
    await applyUserPlaceWriteAction({
      action: transition.action,
      nextState: transition.nextState,
      placeId,
      previousState: currentState,
      uid,
    });

    dispatch(userPlaceStatesActions.userPlaceMutationCommitted({ requestId }));

    return { status: 'fulfilled' };
  } catch (error) {
    dispatch(
      userPlaceStatesActions.userPlaceMutationReverted({
        errorMessage:
          error instanceof Error ? error.message : 'Unable to update your place state.',
        requestId,
      }),
    );

    return {
      errorMessage:
        error instanceof Error ? error.message : 'Unable to update your place state.',
      status: 'rejected',
    };
  }
}

export const runUserPlaceMutation =
  (params: {
    mutation: UserPlaceMutation;
    placeId: string;
  }): AppThunk<Promise<UserPlaceMutationResult>> =>
  async (dispatch, getState) => {
    const { mutation, placeId } = params;
    const state = getState();
    const currentUser = selectCurrentUser(state);

    if (!currentUser) {
      return {
        reason: 'auth-required',
        status: 'skipped',
      };
    }

    if (selectIsUserPlaceMutationPendingForPlace(state, placeId)) {
      return {
        reason: 'pending',
        status: 'skipped',
      };
    }

    const currentState = resolveCurrentUserPlaceState(state, placeId);
    const transition = resolveTransition({
      currentState,
      mutation,
    });

    if (!transition) {
      return {
        reason: 'noop',
        status: 'skipped',
      };
    }

    return commitUserPlaceTransition({
      currentState,
      dispatch,
      placeId,
      transition,
      uid: currentUser.uid,
    });
  };

export const runVisitCheckIn =
  (params: {
    placeId: string;
    visitRecord: UserPlaceVisitRecord;
  }): AppThunk<Promise<UserPlaceMutationResult>> =>
  async (dispatch, getState) => {
    const { placeId, visitRecord } = params;
    const state = getState();
    const currentUser = selectCurrentUser(state);

    if (!currentUser) {
      return {
        reason: 'auth-required',
        status: 'skipped',
      };
    }

    if (selectIsUserPlaceMutationPendingForPlace(state, placeId)) {
      return {
        reason: 'pending',
        status: 'skipped',
      };
    }

    const currentState = resolveCurrentUserPlaceState(state, placeId);

    if (currentState.visited) {
      return {
        reason: 'noop',
        status: 'skipped',
      };
    }

    return commitUserPlaceTransition({
      currentState,
      dispatch,
      placeId,
      transition: {
        action: 'markVisited',
        nextState: {
          ...currentState,
          updatedAtMs: Date.now(),
          visitCoordinates: visitRecord.coordinates,
          visitDistanceMeters: visitRecord.distanceMeters,
          visitMethod: visitRecord.method,
          visitRadiusMeters: visitRecord.radiusMeters,
          visitVerified: visitRecord.verified,
          visited: true,
          visitedAtMs: Date.now(),
        },
      },
      uid: currentUser.uid,
    });
  };
