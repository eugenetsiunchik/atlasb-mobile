import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../store';
import { territoryAdapterSelectors } from './territorySlice';

const territorySelectors = territoryAdapterSelectors.getSelectors<RootState>(
  state => state.territory,
);

export const selectTerritoryState = (state: RootState) => state.territory;
export const selectAllExploredTerritoryCells = territorySelectors.selectAll;
export const selectExploredTerritoryCellById = territorySelectors.selectById;
export const selectTerritoryStatus = (state: RootState) => state.territory.status;
export const selectTerritoryError = (state: RootState) => state.territory.error;

export const selectExploredTerritoryCellIds = createSelector(
  [selectAllExploredTerritoryCells],
  cells => cells.map(cell => cell.cellId),
);
