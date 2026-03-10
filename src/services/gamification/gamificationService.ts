export const BACKEND_FINALIZED_ACTIONS = [
  'discoverPlace',
  'visitPlace',
  'collectPlace',
  'uploadApprovedPhoto',
  'approvedSuggestedEdit',
] as const;

export type GamificationAction = (typeof BACKEND_FINALIZED_ACTIONS)[number];

export const XP_BY_ACTION: Readonly<Record<GamificationAction, number>> =
  Object.freeze({
    discoverPlace: 5,
    visitPlace: 20,
    collectPlace: 30,
    uploadApprovedPhoto: 15,
    approvedSuggestedEdit: 10,
  });

export const LEVEL_THRESHOLDS = Object.freeze([
  { level: 1, minXp: 0 },
  { level: 2, minXp: 100 },
  { level: 3, minXp: 250 },
  { level: 4, minXp: 450 },
  { level: 5, minXp: 700 },
  { level: 6, minXp: 1000 },
  { level: 7, minXp: 1350 },
  { level: 8, minXp: 1750 },
  { level: 9, minXp: 2200 },
  { level: 10, minXp: 2700 },
]);

export type AwardedEventCollection = ReadonlySet<string> | readonly string[];

export type AwardXpInput = {
  action: GamificationAction;
  currentXp: number;
  eventId: string;
  awardedEventIds?: AwardedEventCollection;
};

export type AwardXpResult = {
  action: GamificationAction;
  awardKey: string;
  awarded: boolean;
  awardedEventIds: string[];
  nextLevel: number;
  nextXp: number;
  previousLevel: number;
  previousXp: number;
  reason: 'duplicate-event' | 'invalid-event-id' | null;
  xpDelta: number;
  xpForNextLevel: number;
};

function normalizeXp(xp: number) {
  if (!Number.isFinite(xp) || xp <= 0) {
    return 0;
  }

  return Math.floor(xp);
}

function normalizeEventId(eventId: string) {
  return eventId.trim();
}

function normalizeAwardedEventIds(
  awardedEventIds: AwardedEventCollection | undefined,
) {
  if (!awardedEventIds) {
    return [];
  }

  return Array.from(new Set(awardedEventIds));
}

export function getAwardKey(action: GamificationAction, eventId: string) {
  const normalizedEventId = normalizeEventId(eventId);

  return normalizedEventId ? `${action}:${normalizedEventId}` : '';
}

export function getLevelFromXp(xp: number) {
  const normalizedXp = normalizeXp(xp);
  let currentLevel = LEVEL_THRESHOLDS[0]?.level ?? 1;

  for (const threshold of LEVEL_THRESHOLDS) {
    if (normalizedXp < threshold.minXp) {
      break;
    }

    currentLevel = threshold.level;
  }

  return currentLevel;
}

export function getXpForNextLevel(xp: number) {
  const normalizedXp = normalizeXp(xp);
  const nextThreshold = LEVEL_THRESHOLDS.find(
    threshold => threshold.minXp > normalizedXp,
  );

  if (!nextThreshold) {
    return 0;
  }

  return nextThreshold.minXp - normalizedXp;
}

export function canAwardActionXp({
  action,
  eventId,
  awardedEventIds,
}: Pick<AwardXpInput, 'action' | 'eventId' | 'awardedEventIds'>) {
  const awardKey = getAwardKey(action, eventId);

  if (!awardKey) {
    return false;
  }

  const awardedIds = normalizeAwardedEventIds(awardedEventIds);

  return !awardedIds.includes(awardKey);
}

export function awardXp({
  action,
  currentXp,
  eventId,
  awardedEventIds,
}: AwardXpInput): AwardXpResult {
  const previousXp = normalizeXp(currentXp);
  const previousLevel = getLevelFromXp(previousXp);
  const awardKey = getAwardKey(action, eventId);
  const normalizedAwardedEventIds = normalizeAwardedEventIds(awardedEventIds);

  if (!awardKey) {
    return {
      action,
      awardKey,
      awarded: false,
      awardedEventIds: normalizedAwardedEventIds,
      nextLevel: previousLevel,
      nextXp: previousXp,
      previousLevel,
      previousXp,
      reason: 'invalid-event-id',
      xpDelta: 0,
      xpForNextLevel: getXpForNextLevel(previousXp),
    };
  }

  if (normalizedAwardedEventIds.includes(awardKey)) {
    return {
      action,
      awardKey,
      awarded: false,
      awardedEventIds: normalizedAwardedEventIds,
      nextLevel: previousLevel,
      nextXp: previousXp,
      previousLevel,
      previousXp,
      reason: 'duplicate-event',
      xpDelta: 0,
      xpForNextLevel: getXpForNextLevel(previousXp),
    };
  }

  const xpDelta = XP_BY_ACTION[action];
  const nextXp = previousXp + xpDelta;
  const nextLevel = getLevelFromXp(nextXp);

  return {
    action,
    awardKey,
    awarded: true,
    awardedEventIds: [...normalizedAwardedEventIds, awardKey],
    nextLevel,
    nextXp,
    previousLevel,
    previousXp,
    reason: null,
    xpDelta,
    xpForNextLevel: getXpForNextLevel(nextXp),
  };
}
