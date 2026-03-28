import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { ExploredTerritoryReveal } from '../types';

const territoryAdapter = createEntityAdapter<ExploredTerritoryReveal, string>({
  selectId: reveal => reveal.revealId,
});

function createInitialState() {
  return territoryAdapter.getInitialState({
    error: null as string | null,
    resetVersion: 0,
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  });
}

export type TerritoryState = ReturnType<typeof createInitialState>;

export const territorySlice = createSlice({
  name: 'territory',
  initialState: createInitialState(),
  reducers: {
    territoryCleared(state) {
      territoryAdapter.removeAll(state);
      state.error = null;
      state.resetVersion += 1;
      state.status = 'idle';
    },
    territoryRevealsUpserted(state, action: PayloadAction<ExploredTerritoryReveal[]>) {
      territoryAdapter.upsertMany(state, action.payload);
      state.error = null;
      state.status = 'ready';
    },
    territoryLoadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = 'error';
    },
    territoryLoadingStarted(state) {
      state.error = null;
      state.status = 'loading';
    },
    territoryReceived(state, action: PayloadAction<ExploredTerritoryReveal[]>) {
      territoryAdapter.setAll(state, action.payload);
      state.error = null;
      state.status = 'ready';
    },
  },
});

export const territoryActions = territorySlice.actions;
export const territoryReducer = territorySlice.reducer;
export const territoryAdapterSelectors = territoryAdapter;
