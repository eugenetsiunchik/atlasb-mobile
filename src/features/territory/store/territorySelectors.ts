import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../store';
import { territoryAdapterSelectors } from './territorySlice';

const territorySelectors = territoryAdapterSelectors.getSelectors<RootState>(
  state => state.territory,
);

export const selectTerritoryState = (state: RootState) => state.territory;
export const selectAllExploredTerritoryReveals = territorySelectors.selectAll;
export const selectExploredTerritoryRevealById = territorySelectors.selectById;
export const selectTerritoryStatus = (state: RootState) => state.territory.status;
export const selectTerritoryError = (state: RootState) => state.territory.error;
export const selectTerritoryResetVersion = (state: RootState) => state.territory.resetVersion;

export const selectExploredTerritoryRevealIds = createSelector(
  [selectAllExploredTerritoryReveals],
  reveals => reveals.map(reveal => reveal.revealId),
);
