import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../store';
import { subscribeToPlaces } from '../services/placesService';
import { mapActions, selectMapFilters } from '../store';

export { usePlaceImage } from './usePlaceImage';

export function useMapPlacesSync() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectMapFilters);

  React.useEffect(() => {
    dispatch(mapActions.placesLoadingStarted());

    return subscribeToPlaces(filters, {
      onError: message => {
        dispatch(mapActions.placesLoadFailed(message));
      },
      onSuccess: places => {
        dispatch(mapActions.placesReceived(places));
      },
    });
  }, [dispatch, filters]);
}
