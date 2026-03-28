import { logFirebaseError } from '../../../firebase';
import { selectCurrentUser, type AppThunk } from '../../../store';
import type { MapUserLocation } from '../../map/types';
import { mapActions } from '../../map/store';
import {
  appendGuestExploredTerritoryReveals,
  clearGuestExploredTerritoryCells,
} from '../services/guestTerritoryStorage';
import {
  TERRITORY_REVEAL_FORWARD_OFFSET_METERS,
  type ExploredTerritoryReveal,
} from '../types';
import {
  clearExploredTerritory,
  persistExploredTerritoryReveals,
} from '../services/territoryService';
import { createExplorationRevealFromLocation } from '../utils/reveals';
import { selectAllExploredTerritoryReveals } from './territorySelectors';
import { territoryActions } from './territorySlice';

function createOptimisticReveal(reveal: ExploredTerritoryReveal): ExploredTerritoryReveal {
  return {
    ...reveal,
    createdAtMs: reveal.createdAtMs ?? Date.now(),
    updatedAtMs: Date.now(),
  };
}

export function persistExplorationForLocation(params: {
  location: MapUserLocation;
  radiusMeters: number;
}): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const nextReveal = createExplorationRevealFromLocation({
      forwardOffsetMeters: TERRITORY_REVEAL_FORWARD_OFFSET_METERS,
      location: params.location,
      radiusMeters: params.radiusMeters,
    });
    const alreadyPersisted = selectAllExploredTerritoryReveals(getState()).some(
      reveal => reveal.revealId === nextReveal.revealId,
    );

    if (alreadyPersisted) {
      return;
    }

    dispatch(territoryActions.territoryRevealsUpserted([createOptimisticReveal(nextReveal)]));

    const currentUser = selectCurrentUser(getState());

    if (!currentUser?.uid) {
      try {
        await appendGuestExploredTerritoryReveals([nextReveal]);
      } catch (error) {
        console.warn('[Territory] Unable to persist guest exploration progress', error);
      }
      return;
    }

    try {
      await persistExploredTerritoryReveals({
        reveals: [nextReveal],
        uid: currentUser.uid,
      });
    } catch (error) {
      logFirebaseError(
        'Persist exploration for location failed',
        {
          headingDegrees: nextReveal.headingDegrees,
          latitude: nextReveal.latitude,
          longitude: nextReveal.longitude,
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
      await clearGuestExploredTerritoryCells();
      dispatch(mapActions.userLocationCleared());
      dispatch(territoryActions.territoryCleared());
      return true;
    }

    try {
      await clearGuestExploredTerritoryCells();
      await clearExploredTerritory(currentUser.uid);
      dispatch(mapActions.userLocationCleared());
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
