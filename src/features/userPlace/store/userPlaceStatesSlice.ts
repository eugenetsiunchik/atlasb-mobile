import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { UserPlaceState } from '../types';

const userPlaceStatesAdapter = createEntityAdapter<UserPlaceState, string>({
  selectId: state => state.placeId,
});

type PendingMutationEntry = {
  placeId: string;
  previousState: UserPlaceState | null;
};

function createInitialState() {
  return userPlaceStatesAdapter.getInitialState({
    error: null as string | null,
    pendingByPlaceId: {} as Record<string, number>,
    pendingRequests: {} as Record<string, PendingMutationEntry>,
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  });
}

export type UserPlaceStatesState = ReturnType<typeof createInitialState>;

export const userPlaceStatesSlice = createSlice({
  name: 'userPlaceStates',
  initialState: createInitialState(),
  reducers: {
    userPlaceMutationCommitted(state, action: PayloadAction<{ requestId: string }>) {
      const pendingRequest = state.pendingRequests[action.payload.requestId];

      if (!pendingRequest) {
        return;
      }

      delete state.pendingRequests[action.payload.requestId];

      const currentCount = state.pendingByPlaceId[pendingRequest.placeId] ?? 0;

      if (currentCount <= 1) {
        delete state.pendingByPlaceId[pendingRequest.placeId];
      } else {
        state.pendingByPlaceId[pendingRequest.placeId] = currentCount - 1;
      }
    },
    userPlaceMutationOptimisticallyApplied(
      state,
      action: PayloadAction<{
        nextState: UserPlaceState | null;
        placeId: string;
        previousState: UserPlaceState | null;
        requestId: string;
      }>,
    ) {
      const { nextState, placeId, previousState, requestId } = action.payload;

      state.pendingRequests[requestId] = {
        placeId,
        previousState,
      };
      state.pendingByPlaceId[placeId] = (state.pendingByPlaceId[placeId] ?? 0) + 1;
      state.error = null;

      if (nextState) {
        userPlaceStatesAdapter.upsertOne(state, nextState);
        return;
      }

      userPlaceStatesAdapter.removeOne(state, placeId);
    },
    userPlaceMutationReverted(
      state,
      action: PayloadAction<{
        errorMessage: string;
        requestId: string;
      }>,
    ) {
      const pendingRequest = state.pendingRequests[action.payload.requestId];

      if (!pendingRequest) {
        state.error = action.payload.errorMessage;
        return;
      }

      const { placeId, previousState } = pendingRequest;

      delete state.pendingRequests[action.payload.requestId];

      const currentCount = state.pendingByPlaceId[placeId] ?? 0;

      if (currentCount <= 1) {
        delete state.pendingByPlaceId[placeId];
      } else {
        state.pendingByPlaceId[placeId] = currentCount - 1;
      }

      state.error = action.payload.errorMessage;

      if (previousState) {
        userPlaceStatesAdapter.upsertOne(state, previousState);
        return;
      }

      userPlaceStatesAdapter.removeOne(state, placeId);
    },
    userPlaceStatesCleared(state) {
      userPlaceStatesAdapter.removeAll(state);
      state.error = null;
      state.pendingByPlaceId = {};
      state.pendingRequests = {};
      state.status = 'idle';
    },
    userPlaceStatesLoadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = 'error';
    },
    userPlaceStatesLoadingStarted(state) {
      state.error = null;
      state.status = 'loading';
    },
    userPlaceStatesReceived(state, action: PayloadAction<UserPlaceState[]>) {
      userPlaceStatesAdapter.setAll(state, action.payload);
      state.error = null;
      state.status = 'ready';
    },
  },
});

export const userPlaceStatesActions = userPlaceStatesSlice.actions;
export const userPlaceStatesReducer = userPlaceStatesSlice.reducer;
export const userPlaceStatesAdapterSelectors = userPlaceStatesAdapter;
