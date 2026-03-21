import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { ExploredTerritoryCell } from '../types';

const territoryAdapter = createEntityAdapter<ExploredTerritoryCell, string>({
  selectId: cell => cell.cellId,
});

function createInitialState() {
  return territoryAdapter.getInitialState({
    error: null as string | null,
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
      state.status = 'idle';
    },
    territoryCellsUpserted(state, action: PayloadAction<ExploredTerritoryCell[]>) {
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
    territoryReceived(state, action: PayloadAction<ExploredTerritoryCell[]>) {
      territoryAdapter.setAll(state, action.payload);
      state.error = null;
      state.status = 'ready';
    },
  },
});

export const territoryActions = territorySlice.actions;
export const territoryReducer = territorySlice.reducer;
export const territoryAdapterSelectors = territoryAdapter;
