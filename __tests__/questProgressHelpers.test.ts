import {
  evaluateQuestProgress,
  hasQuestProgressChanged,
} from '../src/features/quests';
import type { QuestDefinition, UserQuestProgress } from '../src/features/quests';
import type { PlaceMapItem } from '../src/features/map/types';
import type { UserPlaceState } from '../src/features/userPlace';

function createPlace(id: string, name: string, region: string): PlaceMapItem {
  return {
    allowManualVisitMarking: false,
    id,
    imageUrl: null,
    thumbnailUrl: null,
    latitude: 0,
    longitude: 0,
    name,
    region,
    regionId: region.toLowerCase(),
    visitVerificationRadiusMeters: 150,
  };
}

function createPlaceState(params: {
  placeId: string;
  visited?: boolean;
}): UserPlaceState {
  return {
    placeId: params.placeId,
    collected: false,
    collectedAtMs: null,
    createdAtMs: 1,
    discovered: false,
    discoveredAtMs: null,
    saved: false,
    savedAtMs: null,
    updatedAtMs: 1,
    visitCoordinates: null,
    visitDistanceMeters: null,
    visitMethod: null,
    visitRadiusMeters: null,
    visitVerified: null,
    visited: params.visited ?? false,
    visitedAtMs: params.visited ? 1 : null,
  };
}

describe('quest progress helpers', () => {
  const places = [
    createPlace('mir', 'Mir Castle Complex', 'Hrodna'),
    createPlace('nesvizh', 'Nesvizh Palace and Residence', 'Minsk'),
    createPlace('lida', 'Lida Castle', 'Hrodna'),
    createPlace('minsk-yard', 'Red Yard', 'Minsk'),
  ];

  it('completes specific-place quests from visited place matches', () => {
    const quest: QuestDefinition = {
      configVersion: 'test',
      description: 'Visit castles',
      id: 'castles',
      imageUrl: null,
      objective: {
        places: [
          {
            id: 'mir-target',
            label: 'Mir Castle',
            matcher: { nameIncludes: 'mir' },
          },
          {
            id: 'nesvizh-target',
            label: 'Nesvizh Castle',
            matcher: { nameIncludes: 'nesvizh' },
          },
        ],
        type: 'visitSpecificPlaces',
      },
      reward: {
        achievementUnlocks: [],
        xp: 100,
      },
      sortOrder: 1,
      status: 'active',
      title: 'Castles',
      type: 'visitSpecificPlaces',
    };

    const progress = evaluateQuestProgress({
      nowMs: 123,
      placeStates: [
        createPlaceState({ placeId: 'mir', visited: true }),
        createPlaceState({ placeId: 'nesvizh', visited: true }),
      ],
      places,
      previousProgress: null,
      quest,
    });

    expect(progress.currentCount).toBe(2);
    expect(progress.status).toBe('completed');
    expect(progress.completedAtMs).toBe(123);
    expect(progress.shouldApplyRewards).toBe(true);
    expect(progress.matchedTargetIds).toEqual(['mir-target', 'nesvizh-target']);
  });

  it('tracks regional progress without overcounting past the target', () => {
    const quest: QuestDefinition = {
      configVersion: 'test',
      description: 'Visit Minsk',
      id: 'minsk-gems',
      imageUrl: null,
      objective: {
        region: 'Minsk',
        requiredCount: 2,
        type: 'visitPlacesInRegion',
      },
      reward: {
        achievementUnlocks: [],
        xp: 50,
      },
      sortOrder: 2,
      status: 'active',
      title: 'Minsk hidden gems',
      type: 'visitPlacesInRegion',
    };

    const progress = evaluateQuestProgress({
      placeStates: [
        createPlaceState({ placeId: 'nesvizh', visited: true }),
        createPlaceState({ placeId: 'minsk-yard', visited: true }),
      ],
      places,
      previousProgress: null,
      quest,
    });

    expect(progress.currentCount).toBe(2);
    expect(progress.targetCount).toBe(2);
    expect(progress.status).toBe('completed');
  });

  it('preserves reward state when nothing meaningful changes', () => {
    const previousProgress: UserQuestProgress = {
      completedAtMs: 10,
      currentCount: 2,
      matchedPlaceIds: ['mir', 'nesvizh'],
      matchedTargetIds: ['mir-target', 'nesvizh-target'],
      progressLabel: '2/2 required places visited',
      questId: 'castles',
      rewardAchievementIds: [],
      rewardAppliedAtMs: 20,
      rewardXp: 100,
      status: 'completed',
      targetCount: 2,
      updatedAtMs: 30,
    };

    const nextProgress = {
      ...previousProgress,
      updatedAtMs: 40,
    };

    expect(hasQuestProgressChanged(previousProgress, nextProgress)).toBe(false);
  });
});
