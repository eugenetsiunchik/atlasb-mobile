import {
  awardXp,
  BACKEND_FINALIZED_ACTIONS,
  canAwardActionXp,
  getAwardKey,
  getLevelFromXp,
  getXpForNextLevel,
  LEVEL_THRESHOLDS,
  XP_BY_ACTION,
} from '../src/services/gamification';

describe('gamificationService', () => {
  describe('getLevelFromXp', () => {
    it('returns level 1 for negative or zero xp', () => {
      expect(getLevelFromXp(-10)).toBe(1);
      expect(getLevelFromXp(0)).toBe(1);
    });

    it('advances exactly on threshold boundaries', () => {
      expect(getLevelFromXp(99)).toBe(1);
      expect(getLevelFromXp(100)).toBe(2);
      expect(getLevelFromXp(250)).toBe(3);
      expect(getLevelFromXp(2700)).toBe(10);
    });

    it('caps at the highest defined level', () => {
      expect(getLevelFromXp(999999)).toBe(
        LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]?.level,
      );
    });
  });

  describe('getXpForNextLevel', () => {
    it('returns remaining xp to the next threshold', () => {
      expect(getXpForNextLevel(0)).toBe(100);
      expect(getXpForNextLevel(99)).toBe(1);
      expect(getXpForNextLevel(100)).toBe(150);
    });

    it('returns 0 when already at the max defined level', () => {
      expect(getXpForNextLevel(2700)).toBe(0);
      expect(getXpForNextLevel(5000)).toBe(0);
    });

    it('normalizes invalid xp values to zero', () => {
      expect(getXpForNextLevel(Number.NaN)).toBe(100);
    });
  });

  describe('canAwardActionXp', () => {
    it('rejects duplicate awards for the same action event', () => {
      expect(
        canAwardActionXp({
          action: 'discoverPlace',
          awardedEventIds: ['discoverPlace:place-1'],
          eventId: 'place-1',
        }),
      ).toBe(false);
    });

    it('allows different actions to reuse the same raw event id', () => {
      expect(
        canAwardActionXp({
          action: 'visitPlace',
          awardedEventIds: ['discoverPlace:place-1'],
          eventId: 'place-1',
        }),
      ).toBe(true);
    });

    it('rejects blank event ids', () => {
      expect(
        canAwardActionXp({
          action: 'collectPlace',
          awardedEventIds: [],
          eventId: '   ',
        }),
      ).toBe(false);
    });
  });

  describe('awardXp', () => {
    it('awards the configured xp and appends the dedupe key', () => {
      const result = awardXp({
        action: 'discoverPlace',
        currentXp: 95,
        awardedEventIds: [],
        eventId: 'place-1',
      });

      expect(result).toMatchObject({
        action: 'discoverPlace',
        awardKey: getAwardKey('discoverPlace', 'place-1'),
        awarded: true,
        nextLevel: 2,
        nextXp: 100,
        previousLevel: 1,
        previousXp: 95,
        reason: null,
        xpDelta: XP_BY_ACTION.discoverPlace,
        xpForNextLevel: 150,
      });
      expect(result.awardedEventIds).toEqual(['discoverPlace:place-1']);
    });

    it('does not mutate xp for duplicate events', () => {
      const result = awardXp({
        action: 'uploadApprovedPhoto',
        currentXp: 120,
        awardedEventIds: ['uploadApprovedPhoto:photo-9'],
        eventId: 'photo-9',
      });

      expect(result).toMatchObject({
        awarded: false,
        nextLevel: 2,
        nextXp: 120,
        previousLevel: 2,
        previousXp: 120,
        reason: 'duplicate-event',
        xpDelta: 0,
        xpForNextLevel: 130,
      });
      expect(result.awardedEventIds).toEqual(['uploadApprovedPhoto:photo-9']);
    });

    it('does not award xp for blank event ids', () => {
      const result = awardXp({
        action: 'approvedSuggestedEdit',
        currentXp: 40,
        awardedEventIds: [],
        eventId: '   ',
      });

      expect(result).toMatchObject({
        awarded: false,
        nextLevel: 1,
        nextXp: 40,
        previousLevel: 1,
        previousXp: 40,
        reason: 'invalid-event-id',
        xpDelta: 0,
      });
    });

    it('accepts a Set of awarded keys and normalizes current xp', () => {
      const result = awardXp({
        action: 'collectPlace',
        currentXp: -4.8,
        awardedEventIds: new Set(['discoverPlace:place-1']),
        eventId: 'place-1',
      });

      expect(result).toMatchObject({
        awarded: true,
        nextLevel: 1,
        nextXp: 30,
        previousLevel: 1,
        previousXp: 0,
        reason: null,
        xpDelta: XP_BY_ACTION.collectPlace,
        xpForNextLevel: 70,
      });
      expect(result.awardedEventIds).toEqual([
        'discoverPlace:place-1',
        'collectPlace:place-1',
      ]);
    });
  });

  it('marks all awardable actions as backend-finalized for integrity', () => {
    expect(BACKEND_FINALIZED_ACTIONS).toEqual([
      'discoverPlace',
      'visitPlace',
      'collectPlace',
      'uploadApprovedPhoto',
      'approvedSuggestedEdit',
    ]);
  });
});
