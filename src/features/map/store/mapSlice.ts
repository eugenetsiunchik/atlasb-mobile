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

function areStringArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

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
      const nextQuery = action.payload.query ?? state.filters.query;
      const nextRegionIds = action.payload.regionIds ?? state.filters.regionIds;

      if (
        nextQuery === state.filters.query &&
        areStringArraysEqual(nextRegionIds, state.filters.regionIds)
      ) {
        return;
      }

      state.filters = {
        query: nextQuery,
        regionIds: nextRegionIds,
      };
    },
    locationPermissionReset(state) {
      if (state.locationPermission === 'unknown' && state.userLocation === null) {
        return;
      }

      state.locationPermission = 'unknown';
      state.userLocation = null;
    },
    locationPermissionSet(
      state,
      action: PayloadAction<MapLocationPermission>,
    ) {
      if (state.locationPermission === action.payload) {
        return;
      }

      state.locationPermission = action.payload;
    },
    placeSelectionCleared(state) {
      if (state.selectedPlaceId === null) {
        return;
      }

      state.selectedPlaceId = null;
    },
    placeSelected(state, action: PayloadAction<string>) {
      if (state.selectedPlaceId === action.payload) {
        return;
      }

      state.selectedPlaceId = action.payload;
    },
    userLocationCleared(state) {
      if (state.userLocation === null) {
        return;
      }

      state.userLocation = null;
    },
    placesLoadFailed(state, action: PayloadAction<string>) {
      if (state.error === action.payload && state.placesStatus === 'error') {
        return;
      }

      state.error = action.payload;
      state.placesStatus = 'error';
    },
    placesLoadingStarted(state) {
      if (state.error === null && state.placesStatus === 'loading') {
        return;
      }

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
