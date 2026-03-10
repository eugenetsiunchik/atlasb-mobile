import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type { UserAchievement } from '../services/gamification';

const userAchievementsAdapter = createEntityAdapter<UserAchievement, string>({
  selectId: achievement => achievement.achievementId,
  sortComparer: (left, right) => right.unlockedAtMs - left.unlockedAtMs,
});

function createInitialState() {
  return userAchievementsAdapter.getInitialState({
    error: null as string | null,
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  });
}

export type UserAchievementsState = ReturnType<typeof createInitialState>;

export const achievementsSlice = createSlice({
  name: 'achievements',
  initialState: createInitialState(),
  reducers: {
    achievementsCleared(state) {
      userAchievementsAdapter.removeAll(state);
      state.error = null;
      state.status = 'idle';
    },
    achievementsLoadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = 'error';
    },
    achievementsLoadingStarted(state) {
      state.error = null;
      state.status = 'loading';
    },
    achievementsReceived(state, action: PayloadAction<UserAchievement[]>) {
      userAchievementsAdapter.setAll(state, action.payload);
      state.error = null;
      state.status = 'ready';
    },
  },
});

export const achievementsActions = achievementsSlice.actions;
export const achievementsReducer = achievementsSlice.reducer;
export const userAchievementsAdapterSelectors = userAchievementsAdapter;
