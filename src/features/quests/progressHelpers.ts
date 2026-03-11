import type { PlaceMapItem } from '../map/types';
import type { UserPlaceState } from '../userPlace/types';
import type {
  QuestDefinition,
  QuestPlaceMatcher,
  QuestProgressEvaluation,
  UserQuestProgress,
} from './types';

function normalizeString(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function toUniqueSorted(values: Iterable<string>) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function buildVisitedPlaceIds(placeStates: UserPlaceState[]) {
  return new Set(
    placeStates.filter(placeState => placeState.visited).map(placeState => placeState.placeId),
  );
}

function placeMatchesMatcher(place: PlaceMapItem, matcher: QuestPlaceMatcher) {
  const normalizedPlaceId = normalizeString(place.id);
  const normalizedPlaceName = normalizeString(place.name);
  const normalizedRegion = normalizeString(place.region);
  const normalizedMatcherPlaceId = normalizeString(matcher.placeId);
  const normalizedMatcherNameEquals = normalizeString(matcher.nameEquals);
  const normalizedMatcherNameIncludes = normalizeString(matcher.nameIncludes);
  const normalizedMatcherRegion = normalizeString(matcher.region);

  if (normalizedMatcherPlaceId && normalizedMatcherPlaceId !== normalizedPlaceId) {
    return false;
  }

  if (normalizedMatcherRegion && normalizedMatcherRegion !== normalizedRegion) {
    return false;
  }

  if (normalizedMatcherNameEquals && normalizedMatcherNameEquals !== normalizedPlaceName) {
    return false;
  }

  if (
    normalizedMatcherNameIncludes &&
    !normalizedPlaceName.includes(normalizedMatcherNameIncludes)
  ) {
    return false;
  }

  return true;
}

function buildRegionQuestProgressLabel(currentCount: number, targetCount: number, region: string) {
  return `${currentCount}/${targetCount} places visited in ${region}`;
}

function buildListQuestProgressLabel(currentCount: number, targetCount: number, label: string) {
  return `${currentCount}/${targetCount} ${label} visited`;
}

export function getQuestObjectiveSummary(quest: QuestDefinition) {
  switch (quest.objective.type) {
    case 'visitSpecificPlaces':
      return `${quest.objective.places.length} specific places`;
    case 'visitPlacesInRegion':
      return `Visit ${quest.objective.requiredCount} places in ${quest.objective.region}`;
    case 'completeThemedCollection':
      return `${quest.objective.places.length} places from ${quest.objective.themeLabel}`;
  }
}

export function getQuestTargetLabels(quest: QuestDefinition) {
  switch (quest.objective.type) {
    case 'visitSpecificPlaces':
    case 'completeThemedCollection':
      return quest.objective.places.map(place => ({
        id: place.id,
        label: place.label,
      }));
    case 'visitPlacesInRegion':
      return [];
  }
}

export function evaluateQuestProgress(params: {
  nowMs?: number;
  placeStates: UserPlaceState[];
  places: PlaceMapItem[];
  previousProgress: UserQuestProgress | null;
  quest: QuestDefinition;
}): QuestProgressEvaluation {
  const { nowMs = Date.now(), placeStates, places, previousProgress, quest } = params;
  const visitedPlaceIds = buildVisitedPlaceIds(placeStates);
  const { objective } = quest;

  switch (objective.type) {
    case 'visitSpecificPlaces':
    case 'completeThemedCollection': {
      const matchedTargetIds = objective.places
        .filter(target =>
          places.some(
            place => placeMatchesMatcher(place, target.matcher) && visitedPlaceIds.has(place.id),
          ),
        )
        .map(target => target.id);
      const matchedPlaceIds = places
        .filter(place => visitedPlaceIds.has(place.id))
        .filter(place => objective.places.some(target => placeMatchesMatcher(place, target.matcher)))
        .map(place => place.id);
      const targetCount = objective.places.length;
      const currentCount = Math.min(matchedTargetIds.length, targetCount);
      const completedAtMs =
        currentCount >= targetCount ? previousProgress?.completedAtMs ?? nowMs : null;
      const rewardAppliedAtMs = completedAtMs ? previousProgress?.rewardAppliedAtMs ?? null : null;

      return {
        completedAtMs,
        currentCount,
        matchedPlaceIds: toUniqueSorted(matchedPlaceIds),
        matchedTargetIds: toUniqueSorted(matchedTargetIds),
        progressLabel: buildListQuestProgressLabel(
          currentCount,
          targetCount,
          objective.type === 'visitSpecificPlaces' ? 'required places' : objective.themeLabel,
        ),
        questId: quest.id,
        rewardAchievementIds: quest.reward.achievementUnlocks.map(unlock => unlock.achievementId),
        rewardAppliedAtMs,
        rewardXp: quest.reward.xp,
        shouldApplyRewards: completedAtMs !== null && rewardAppliedAtMs === null,
        status: completedAtMs ? 'completed' : 'active',
        targetCount,
        updatedAtMs: nowMs,
      };
    }
    case 'visitPlacesInRegion': {
      const normalizedRegion = normalizeString(objective.region);
      const matchedPlaceIds = places
        .filter(place => normalizeString(place.region) === normalizedRegion)
        .filter(place => visitedPlaceIds.has(place.id))
        .map(place => place.id);
      const targetCount = Math.max(1, objective.requiredCount);
      const currentCount = Math.min(matchedPlaceIds.length, targetCount);
      const completedAtMs =
        matchedPlaceIds.length >= targetCount ? previousProgress?.completedAtMs ?? nowMs : null;
      const rewardAppliedAtMs = completedAtMs ? previousProgress?.rewardAppliedAtMs ?? null : null;

      return {
        completedAtMs,
        currentCount,
        matchedPlaceIds: toUniqueSorted(matchedPlaceIds),
        matchedTargetIds: toUniqueSorted(matchedPlaceIds),
        progressLabel: buildRegionQuestProgressLabel(
          currentCount,
          targetCount,
          objective.region,
        ),
        questId: quest.id,
        rewardAchievementIds: quest.reward.achievementUnlocks.map(unlock => unlock.achievementId),
        rewardAppliedAtMs,
        rewardXp: quest.reward.xp,
        shouldApplyRewards: completedAtMs !== null && rewardAppliedAtMs === null,
        status: completedAtMs ? 'completed' : 'active',
        targetCount,
        updatedAtMs: nowMs,
      };
    }
  }
}

export function hasQuestProgressChanged(
  previousProgress: UserQuestProgress | null,
  nextProgress: UserQuestProgress,
) {
  if (!previousProgress) {
    return true;
  }

  return (
    previousProgress.completedAtMs !== nextProgress.completedAtMs ||
    previousProgress.currentCount !== nextProgress.currentCount ||
    previousProgress.progressLabel !== nextProgress.progressLabel ||
    previousProgress.rewardAppliedAtMs !== nextProgress.rewardAppliedAtMs ||
    previousProgress.status !== nextProgress.status ||
    previousProgress.targetCount !== nextProgress.targetCount ||
    previousProgress.rewardXp !== nextProgress.rewardXp ||
    previousProgress.matchedPlaceIds.join('|') !== nextProgress.matchedPlaceIds.join('|') ||
    previousProgress.matchedTargetIds.join('|') !== nextProgress.matchedTargetIds.join('|') ||
    previousProgress.rewardAchievementIds.join('|') !==
      nextProgress.rewardAchievementIds.join('|')
  );
}
