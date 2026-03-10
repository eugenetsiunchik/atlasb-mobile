import type { PlaceMapItem } from '../../features/map/types';
import type { UserPlaceState } from '../../features/userPlace/types';
import {
  createDefaultAchievementStats,
  type AchievementDefinition,
  type AchievementEvaluationContext,
  type AchievementEvaluationResult,
  type AchievementProgress,
  type AchievementStats,
  type AchievementUnlockDraft,
} from './achievementTypes';

function toNonNegativeInteger(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function buildVisitedPlaceIds(placeStates: UserPlaceState[]) {
  return new Set(
    placeStates.filter(placeState => placeState.visited).map(placeState => placeState.placeId),
  );
}

function buildCollectedPlaceIds(placeStates: UserPlaceState[]) {
  return new Set(
    placeStates
      .filter(placeState => placeState.collected)
      .map(placeState => placeState.placeId),
  );
}

function buildVisitedRegionCounts(params: {
  places: PlaceMapItem[];
  visitedPlaceIds: ReadonlySet<string>;
}) {
  const { places, visitedPlaceIds } = params;
  const countsByRegion: Record<string, number> = {};

  for (const place of places) {
    const normalizedRegion = place.region.trim();

    if (!normalizedRegion || !visitedPlaceIds.has(place.id)) {
      continue;
    }

    countsByRegion[normalizedRegion] = (countsByRegion[normalizedRegion] ?? 0) + 1;
  }

  return countsByRegion;
}

function buildAchievementProgress(params: {
  context: AchievementEvaluationContext;
  definition: AchievementDefinition;
}): AchievementProgress {
  const { context, definition } = params;
  const visitedPlaceIds = buildVisitedPlaceIds(context.placeStates);
  const collectedPlaceIds = buildCollectedPlaceIds(context.placeStates);

  switch (definition.criteria.type) {
    case 'visitedPlacesCount': {
      const target = toNonNegativeInteger(definition.criteria.count);
      const current = Math.min(visitedPlaceIds.size, target);

      return {
        complete: target > 0 && current >= target,
        current,
        label: `${Math.min(visitedPlaceIds.size, target)}/${target} places visited`,
        target,
      };
    }
    case 'collectedPlacesCount': {
      const target = toNonNegativeInteger(definition.criteria.count);
      const current = Math.min(collectedPlaceIds.size, target);

      return {
        complete: target > 0 && current >= target,
        current,
        label: `${Math.min(collectedPlaceIds.size, target)}/${target} places collected`,
        target,
      };
    }
    case 'uploadedPhotosCount': {
      const target = toNonNegativeInteger(definition.criteria.count);
      const uploadedPhotosCount = toNonNegativeInteger(context.stats.uploadedPhotosCount);
      const current = Math.min(uploadedPhotosCount, target);

      return {
        complete: target > 0 && uploadedPhotosCount >= target,
        current,
        label: `${current}/${target} photos uploaded`,
        target,
      };
    }
    case 'completedQuestsCount': {
      const target = toNonNegativeInteger(definition.criteria.count);
      const completedQuestsCount = toNonNegativeInteger(context.stats.completedQuestsCount);
      const current = Math.min(completedQuestsCount, target);

      return {
        complete: target > 0 && completedQuestsCount >= target,
        current,
        label: `${current}/${target} quests completed`,
        target,
      };
    }
    case 'visitedPlaceInEveryRegion': {
      const normalizedRegions = Array.from(
        new Set(context.places.map(place => place.region.trim()).filter(Boolean)),
      );
      const target = normalizedRegions.length;

      if (target === 0) {
        return {
          complete: false,
          current: 0,
          label: '0/0 regions visited',
          target: 0,
        };
      }

      const visitedRegionCounts = buildVisitedRegionCounts({
        places: context.places,
        visitedPlaceIds,
      });
      const minPlacesPerRegion = Math.max(1, definition.criteria.minPlacesPerRegion);
      const completedRegions = normalizedRegions.filter(
        region => (visitedRegionCounts[region] ?? 0) >= minPlacesPerRegion,
      ).length;

      return {
        complete: completedRegions >= target,
        current: completedRegions,
        label: `${completedRegions}/${target} regions visited`,
        target,
      };
    }
  }
}

export function buildAchievementEvaluationContext(params: {
  placeStates: UserPlaceState[];
  places: PlaceMapItem[];
  stats?: Partial<AchievementStats>;
}): AchievementEvaluationContext {
  return {
    placeStates: params.placeStates,
    places: params.places,
    stats: {
      ...createDefaultAchievementStats(),
      ...params.stats,
    },
  };
}

export function evaluateAchievementDefinitions(params: {
  context: AchievementEvaluationContext;
  definitions: readonly AchievementDefinition[];
  nowMs?: number;
  unlockedAchievementIds: Iterable<string>;
}): AchievementEvaluationResult {
  const unlockedAchievementIds = new Set(params.unlockedAchievementIds);
  const states = params.definitions.map(definition => {
    const progress = buildAchievementProgress({
      context: params.context,
      definition,
    });

    return {
      definition,
      isUnlocked: unlockedAchievementIds.has(definition.id),
      progress,
    };
  });
  const unlocks: AchievementUnlockDraft[] = states
    .filter(state => state.progress.complete && !state.isUnlocked)
    .map(state => ({
      achievementId: state.definition.id,
      category: state.definition.category,
      configVersion: state.definition.configVersion,
      description: state.definition.description,
      icon: state.definition.icon,
      title: state.definition.title,
      unlockedAtMs: params.nowMs ?? Date.now(),
      xpReward: state.definition.xpReward,
    }));

  return {
    states,
    unlocks,
  };
}
