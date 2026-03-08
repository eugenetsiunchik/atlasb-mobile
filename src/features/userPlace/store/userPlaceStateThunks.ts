import { applyUserPlaceWriteAction } from '../services/userPlaceStatesService';
import {
  createEmptyUserPlaceState,
  hasPersistedUserPlaceState,
  type UserPlaceMutation,
  type UserPlaceMutationResult,
  type UserPlaceState,
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
        uid: currentUser.uid,
      });

      dispatch(userPlaceStatesActions.userPlaceMutationCommitted({ requestId }));

      return { status: 'fulfilled' };
    } catch (error) {
      dispatch(
        userPlaceStatesActions.userPlaceMutationReverted({
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Unable to update your place state.',
          requestId,
        }),
      );

      return {
        errorMessage:
          error instanceof Error
            ? error.message
            : 'Unable to update your place state.',
        status: 'rejected',
      };
    }
  };
