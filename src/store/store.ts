import {
  configureStore,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';

import { mapReducer } from '../features/map/store';
import { userPlaceStatesReducer } from '../features/userPlace';
import { authReducer } from './auth';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    map: mapReducer,
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
