import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { QuestDefinition, UserQuestProgress } from '../types';

const questsAdapter = createEntityAdapter<QuestDefinition, string>({
  selectId: quest => quest.id,
  sortComparer: (left, right) =>
    left.sortOrder - right.sortOrder || left.title.localeCompare(right.title),
});

function createInitialState() {
  return questsAdapter.getInitialState({
    progressByQuestId: {} as Record<string, UserQuestProgress>,
    progressError: null as string | null,
    progressStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    questsError: null as string | null,
    questsStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  });
}

export type QuestsState = ReturnType<typeof createInitialState>;

export const questsSlice = createSlice({
  name: 'quests',
  initialState: createInitialState(),
  reducers: {
    questProgressCleared(state) {
      state.progressByQuestId = {};
      state.progressError = null;
      state.progressStatus = 'idle';
    },
    questProgressLoadFailed(state, action: PayloadAction<string>) {
      state.progressError = action.payload;
      state.progressStatus = 'error';
    },
    questProgressLoadingStarted(state) {
      state.progressError = null;
      state.progressStatus = 'loading';
    },
    questProgressReceived(state, action: PayloadAction<UserQuestProgress[]>) {
      state.progressByQuestId = Object.fromEntries(
        action.payload.map(progress => [progress.questId, progress]),
      );
      state.progressError = null;
      state.progressStatus = 'ready';
    },
    questProgressUpserted(state, action: PayloadAction<UserQuestProgress[]>) {
      for (const progress of action.payload) {
        state.progressByQuestId[progress.questId] = progress;
      }

      state.progressError = null;
      state.progressStatus = 'ready';
    },
    questsLoadFailed(state, action: PayloadAction<string>) {
      state.questsError = action.payload;
      state.questsStatus = 'error';
    },
    questsLoadingStarted(state) {
      state.questsError = null;
      state.questsStatus = 'loading';
    },
    questsReceived(state, action: PayloadAction<QuestDefinition[]>) {
      questsAdapter.setAll(state, action.payload);
      state.questsError = null;
      state.questsStatus = 'ready';
    },
  },
});

export const questsActions = questsSlice.actions;
export const questsReducer = questsSlice.reducer;
export const questsAdapterSelectors = questsAdapter;
