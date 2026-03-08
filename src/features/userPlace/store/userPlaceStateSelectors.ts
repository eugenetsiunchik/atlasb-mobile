import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../store';
import { createEmptyUserPlaceState } from '../types';
import { userPlaceStatesAdapterSelectors } from './userPlaceStatesSlice';

const userPlaceStateSelectors = userPlaceStatesAdapterSelectors.getSelectors<RootState>(
  state => state.userPlaceStates,
);

export const selectUserPlaceStatesState = (state: RootState) => state.userPlaceStates;
export const selectAllUserPlaceStates = userPlaceStateSelectors.selectAll;
export const selectUserPlaceStatesStatus = (state: RootState) =>
  state.userPlaceStates.status;
export const selectUserPlaceStatesError = (state: RootState) =>
  state.userPlaceStates.error;
export const selectUserPlaceStateById = (state: RootState, placeId: string) =>
  userPlaceStateSelectors.selectById(state, placeId);
export const selectIsUserPlaceMutationPendingForPlace = (
  state: RootState,
  placeId: string,
) => (state.userPlaceStates.pendingByPlaceId[placeId] ?? 0) > 0;

export const makeSelectResolvedUserPlaceState = () =>
  createSelector(
    [
      (state: RootState, placeId: string) => placeId,
      (state: RootState, placeId: string) => selectUserPlaceStateById(state, placeId),
      (state: RootState, placeId: string) =>
        selectIsUserPlaceMutationPendingForPlace(state, placeId),
    ],
    (placeId, userPlaceState, isPending) => ({
      ...(userPlaceState ?? createEmptyUserPlaceState(placeId)),
      isPending,
    }),
  );
