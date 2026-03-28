import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ExploredTerritoryReveal } from '../types';
import { mergeExplorationReveals } from '../utils/reveals';

const GUEST_TERRITORY_STORAGE_KEY = '@atlasb/guestExploredTerritory';
const GUEST_TERRITORY_STORAGE_VERSION = 1;

type GuestTerritoryStoragePayload = {
  reveals: ExploredTerritoryReveal[];
  version: number;
};

function isValidExplorationReveal(value: unknown): value is ExploredTerritoryReveal {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ExploredTerritoryReveal>;

  return (
    typeof candidate.revealId === 'string' &&
    candidate.revealId.trim().length > 0 &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    typeof candidate.radiusMeters === 'number'
  );
}

function parseStoredGuestTerritoryPayload(value: string | null) {
  if (!value) {
    return [] as ExploredTerritoryReveal[];
  }

  try {
    const parsed = JSON.parse(value) as
      | Partial<GuestTerritoryStoragePayload>
      | ExploredTerritoryReveal[];

    if (Array.isArray(parsed)) {
      return mergeExplorationReveals([], parsed.filter(isValidExplorationReveal));
    }

    if (
      parsed.version === GUEST_TERRITORY_STORAGE_VERSION &&
      Array.isArray(parsed.reveals)
    ) {
      return mergeExplorationReveals([], parsed.reveals.filter(isValidExplorationReveal));
    }
  } catch (error) {
    console.warn('[Territory] Unable to parse guest exploration progress', error);
  }

  return [];
}

async function writeGuestExplorationReveals(reveals: ExploredTerritoryReveal[]) {
  const normalizedReveals = mergeExplorationReveals([], reveals);

  if (normalizedReveals.length === 0) {
    await AsyncStorage.removeItem(GUEST_TERRITORY_STORAGE_KEY);
    return;
  }

  const payload: GuestTerritoryStoragePayload = {
    reveals: normalizedReveals,
    version: GUEST_TERRITORY_STORAGE_VERSION,
  };

  await AsyncStorage.setItem(GUEST_TERRITORY_STORAGE_KEY, JSON.stringify(payload));
}

export async function loadGuestExploredTerritoryReveals() {
  const storedValue = await AsyncStorage.getItem(GUEST_TERRITORY_STORAGE_KEY);

  return parseStoredGuestTerritoryPayload(storedValue);
}

export async function appendGuestExploredTerritoryReveals(reveals: ExploredTerritoryReveal[]) {
  if (reveals.length === 0) {
    return;
  }

  const existingReveals = await loadGuestExploredTerritoryReveals();
  await writeGuestExplorationReveals([...existingReveals, ...reveals]);
}

export async function clearGuestExploredTerritoryCells() {
  await AsyncStorage.removeItem(GUEST_TERRITORY_STORAGE_KEY);
}
