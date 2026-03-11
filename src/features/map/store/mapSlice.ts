import {
  createEntityAdapter,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';

import type {
  MapFilters,
  MapLocationPermission,
  MapUserLocation,
  PlaceMapItem,
} from '../types';

const placesAdapter = createEntityAdapter<PlaceMapItem>();
const initialFilters: MapFilters = {
  query: '',
  regionIds: [],
};

export type MapState = ReturnType<typeof createInitialState>;

function createInitialState() {
  return placesAdapter.getInitialState({
    error: null as string | null,
    filters: initialFilters,
    locationPermission: 'unknown' as MapLocationPermission,
    placesStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    selectedPlaceId: null as string | null,
    userLocation: null as MapUserLocation | null,
  });
}

export const mapSlice = createSlice({
  name: 'map',
  initialState: createInitialState(),
  reducers: {
    filtersUpdated(state, action: PayloadAction<Partial<MapFilters>>) {
      state.filters = {
        ...state.filters,
        ...action.payload,
      };
    },
    locationPermissionReset(state) {
      state.locationPermission = 'unknown';
      state.userLocation = null;
    },
    locationPermissionSet(
      state,
      action: PayloadAction<MapLocationPermission>,
    ) {
      state.locationPermission = action.payload;
    },
    placeSelectionCleared(state) {
      state.selectedPlaceId = null;
    },
    placeSelected(state, action: PayloadAction<string>) {
      state.selectedPlaceId = action.payload;
    },
    placesLoadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.placesStatus = 'error';
    },
    placesLoadingStarted(state) {
      state.error = null;
      state.placesStatus = 'loading';
    },
    placesReceived(state, action: PayloadAction<PlaceMapItem[]>) {
      placesAdapter.setAll(state, action.payload);
      state.error = null;
      state.placesStatus = 'ready';

      if (
        state.selectedPlaceId &&
        !action.payload.some(place => place.id === state.selectedPlaceId)
      ) {
        state.selectedPlaceId = null;
      }
    },
    userLocationUpdated(state, action: PayloadAction<MapUserLocation>) {
      state.locationPermission = 'granted';
      state.userLocation = action.payload;
    },
  },
});

export const mapReducer = mapSlice.reducer;
export const mapActions = mapSlice.actions;
export const mapPlacesAdapter = placesAdapter;
