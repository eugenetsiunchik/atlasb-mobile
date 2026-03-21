import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { mapReducer } from '../features/map/store';
import { questsReducer } from '../features/quests';
import { territoryReducer } from '../features/territory';
import { userPlaceStatesReducer } from '../features/userPlace';
import { authReducer } from './auth';
import { achievementsReducer } from './achievementsSlice';

export const store = configureStore({
  reducer: {
    achievements: achievementsReducer,
    auth: authReducer,
    map: mapReducer,
    quests: questsReducer,
    territory: territoryReducer,
    userPlaceStates: userPlaceStatesReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  UnknownAction
>;
