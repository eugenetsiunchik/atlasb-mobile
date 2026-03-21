import React from 'react';

import { selectCurrentUser, useAppDispatch, useAppSelector } from '../../../store';
import { subscribeToExploredTerritory } from '../services/territoryService';
import { territoryActions } from '../store';

export function useExploredTerritorySync() {
  const currentUser = useAppSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (!currentUser?.uid) {
      dispatch(territoryActions.territoryCleared());
      return;
    }

    dispatch(territoryActions.territoryLoadingStarted());

    return subscribeToExploredTerritory(currentUser.uid, {
      onError: message => {
        dispatch(territoryActions.territoryLoadFailed(message));
      },
      onSuccess: territoryCells => {
        dispatch(territoryActions.territoryReceived(territoryCells));
      },
    });
  }, [currentUser?.uid, dispatch]);
}
