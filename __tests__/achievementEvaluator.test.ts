import {
  ACHIEVEMENT_DEFINITIONS,
  buildAchievementEvaluationContext,
  evaluateAchievementDefinitions,
} from '../src/services/gamification';
import type { PlaceMapItem } from '../src/features/map/types';
import type { UserPlaceState } from '../src/features/userPlace';

function createPlace(id: string, region: string): PlaceMapItem {
  return {
    allowManualVisitMarking: false,
    id,
    imageUrl: null,
    thumbnailUrl: null,
    latitude: 0,
    longitude: 0,
    name: id,
    region,
    regionId: region.toLowerCase(),
    visitVerificationRadiusMeters: 150,
  };
}

function createPlaceState(params: {
  collected?: boolean;
  placeId: string;
  visited?: boolean;
}): UserPlaceState {
  return {
    placeId: params.placeId,
    collected: params.collected ?? false,
    collectedAtMs: params.collected ? Date.now() : null,
    createdAtMs: Date.now(),
    discovered: false,
    discoveredAtMs: null,
    saved: false,
    savedAtMs: null,
    updatedAtMs: Date.now(),
    visitCoordinates: null,
    visitDistanceMeters: null,
    visitMethod: null,
    visitRadiusMeters: null,
    visitVerified: null,
    visited: params.visited ?? false,
    visitedAtMs: params.visited ? Date.now() : null,
  };
}

describe('achievementEvaluator', () => {
  const places = [
    createPlace('place-1', 'north'),
    createPlace('place-2', 'south'),
    createPlace('place-3', 'east'),
  ];

  it('unlocks visit and collect achievements from user place state progress', () => {
    const result = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates: [createPlaceState({ placeId: 'place-1', visited: true, collected: true })],
        places,
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      nowMs: 123,
      unlockedAchievementIds: [],
    });

    expect(result.unlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: 'first-place-visited',
          unlockedAtMs: 123,
          xpReward: 25,
        }),
        expect.objectContaining({
          achievementId: 'first-place-collected',
          unlockedAtMs: 123,
          xpReward: 35,
        }),
      ]),
    );
  });

  it('unlocks the all-regions achievement when each region has a visited place', () => {
    const placeStates: UserPlaceState[] = [
      createPlaceState({ placeId: 'place-1', visited: true }),
      createPlaceState({ placeId: 'place-2', visited: true }),
      createPlaceState({ placeId: 'place-3', visited: true }),
    ];

    const result = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates,
        places,
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      unlockedAchievementIds: [],
    });

    expect(result.unlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: 'one-place-each-region',
        }),
      ]),
    );
  });

  it('does not re-emit already unlocked achievements', () => {
    const result = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates: [createPlaceState({ placeId: 'place-1', visited: true })],
        places,
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      unlockedAchievementIds: ['first-place-visited'],
    });

    expect(result.unlocks).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: 'first-place-visited',
        }),
      ]),
    );
  });

  it('supports backend-friendly quest and photo counters through config', () => {
    const result = evaluateAchievementDefinitions({
      context: buildAchievementEvaluationContext({
        placeStates: [],
        places,
        stats: {
          completedQuestsCount: 1,
          uploadedPhotosCount: 1,
        },
      }),
      definitions: ACHIEVEMENT_DEFINITIONS,
      unlockedAchievementIds: [],
    });

    expect(result.unlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          achievementId: 'first-photo-uploaded',
        }),
        expect.objectContaining({
          achievementId: 'first-quest-completed',
        }),
      ]),
    );
  });
});
