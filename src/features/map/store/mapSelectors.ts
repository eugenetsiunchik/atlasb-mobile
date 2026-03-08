import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '../../../store';
import { mapPlacesAdapter } from './mapSlice';

const mapSelectors = mapPlacesAdapter.getSelectors<RootState>(state => state.map);

export const selectMapState = (state: RootState) => state.map;
export const selectAllMapPlaces = mapSelectors.selectAll;
export const selectMapPlacesStatus = (state: RootState) => state.map.placesStatus;
export const selectMapError = (state: RootState) => state.map.error;
export const selectMapFilters = (state: RootState) => state.map.filters;
export const selectLocationPermission = (state: RootState) =>
  state.map.locationPermission;
export const selectUserLocation = (state: RootState) => state.map.userLocation;
export const selectSelectedPlaceId = (state: RootState) => state.map.selectedPlaceId;

export const selectSelectedPlace = createSelector(
  [selectAllMapPlaces, selectSelectedPlaceId],
  (places, selectedPlaceId) =>
    selectedPlaceId
      ? places.find(place => place.id === selectedPlaceId) ?? null
      : null,
);
