import { logFirebaseError } from '../../../firebase';
import { selectCurrentUser, type AppThunk } from '../../../store';
import type { MapCoordinate } from '../../map/types';
import type { ExploredTerritoryCell, TerritoryCellCoordinate } from '../types';
import { TERRITORY_STORAGE_GRID_ZOOM } from '../types';
import {
  clearExploredTerritory,
  persistExploredTerritoryCells,
} from '../services/territoryService';
import { getTerritoryCellId, getTerritoryCellsWithinRadius } from '../utils/grid';
import { selectAllExploredTerritoryCells } from './territorySelectors';
import { territoryActions } from './territorySlice';

function createOptimisticTerritoryCells(cells: TerritoryCellCoordinate[]): ExploredTerritoryCell[] {
  const now = Date.now();

  return cells.map(cell => ({
    cellId: getTerritoryCellId(cell),
    createdAtMs: now,
    gridZoom: cell.gridZoom,
    updatedAtMs: now,
    x: cell.x,
    y: cell.y,
  }));
}

export function persistExplorationForLocation(params: {
  center: MapCoordinate;
  radiusMeters: number;
}): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const currentUser = selectCurrentUser(getState());

    if (!currentUser?.uid) {
      return;
    }

    const existingCellIds = new Set(
      selectAllExploredTerritoryCells(getState()).map(cell => cell.cellId),
    );
    const nextCells = getTerritoryCellsWithinRadius({
      center: params.center,
      gridZoom: TERRITORY_STORAGE_GRID_ZOOM,
      radiusMeters: params.radiusMeters,
    }).filter(cell => !existingCellIds.has(getTerritoryCellId(cell)));

    if (nextCells.length === 0) {
      return;
    }

    dispatch(territoryActions.territoryCellsUpserted(createOptimisticTerritoryCells(nextCells)));

    try {
      await persistExploredTerritoryCells({
        cells: nextCells,
        uid: currentUser.uid,
      });
    } catch (error) {
      logFirebaseError(
        'Persist exploration for location failed',
        {
          cellCount: nextCells.length,
          latitude: params.center.latitude,
          longitude: params.center.longitude,
          radiusMeters: params.radiusMeters,
          uid: currentUser.uid,
        },
        error,
      );
    }
  };
}

export function resetExplorationProgress(): AppThunk<Promise<boolean>> {
  return async (dispatch, getState) => {
    const currentUser = selectCurrentUser(getState());

    if (!currentUser?.uid) {
      return false;
    }

    try {
      await clearExploredTerritory(currentUser.uid);
      dispatch(territoryActions.territoryCleared());
      return true;
    } catch (error) {
      logFirebaseError(
        'Reset exploration progress failed',
        {
          uid: currentUser.uid,
        },
        error,
      );
      throw error;
    }
  };
}
