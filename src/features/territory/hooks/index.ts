import React from 'react';

import {
  selectAuthInitializing,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
} from '../../../store';
import {
  clearGuestExploredTerritoryCells,
  loadGuestExploredTerritoryReveals,
} from '../services/guestTerritoryStorage';
import {
  persistExploredTerritoryReveals,
  subscribeToExploredTerritory,
} from '../services/territoryService';
import { territoryActions } from '../store';
import { mergeExplorationReveals } from '../utils/reveals';

export function useExploredTerritorySync() {
  const authInitializing = useAppSelector(selectAuthInitializing);
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (authInitializing) {
      return;
    }

    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    dispatch(territoryActions.territoryLoadingStarted());

    const syncExploredTerritory = async () => {
      try {
        if (!currentUser?.uid) {
          const guestTerritoryReveals = await loadGuestExploredTerritoryReveals();

          if (!isActive) {
            return;
          }

          dispatch(territoryActions.territoryReceived(guestTerritoryReveals));
          return;
        }

        let guestTerritoryReveals = await loadGuestExploredTerritoryReveals();

        if (guestTerritoryReveals.length > 0) {
          try {
            await persistExploredTerritoryReveals({
              reveals: guestTerritoryReveals,
              uid: currentUser.uid,
            });
            await clearGuestExploredTerritoryCells();
            guestTerritoryReveals = [];
          } catch (error) {
            console.warn('[Territory] Unable to upload guest exploration progress', error);
          }
        }

        if (!isActive) {
          return;
        }

        unsubscribe = subscribeToExploredTerritory(currentUser.uid, {
          onError: message => {
            if (!isActive) {
              return;
            }

            dispatch(territoryActions.territoryLoadFailed(message));
          },
          onSuccess: territoryCells => {
            if (!isActive) {
              return;
            }

            dispatch(
              territoryActions.territoryReceived(
                guestTerritoryReveals.length > 0
                  ? mergeExplorationReveals(territoryCells, guestTerritoryReveals)
                  : territoryCells,
              ),
            );
          },
        });
      } catch (error) {
          if (!isActive) {
            return;
          }

          dispatch(
            territoryActions.territoryLoadFailed(
              error instanceof Error
                ? error.message
                : 'Unable to load exploration progress.',
            ),
          );
      }
    };

    syncExploredTerritory().catch(error => {
      if (!isActive) {
        return;
      }

      dispatch(
        territoryActions.territoryLoadFailed(
          error instanceof Error ? error.message : 'Unable to load exploration progress.',
        ),
      );
    });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [authInitializing, currentUser?.uid, dispatch]);
}
