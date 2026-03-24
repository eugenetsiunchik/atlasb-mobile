import {
  evaluateLocationProposalEligibility,
  getPermissionDeniedLocationProposalMessage,
} from './placeLocationProposalEligibility';

describe('evaluateLocationProposalEligibility', () => {
  it('returns ready for a fresh accurate fix', () => {
    const result = evaluateLocationProposalEligibility({
      location: {
        accuracyMeters: 18,
        capturedAtMs: 1_000,
        latitude: 53.9,
        longitude: 27.56,
      },
      nowMs: 2_000,
    });

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(result.coordinates.latitude).toBe(53.9);
      expect(result.coordinates.longitude).toBe(27.56);
    }
  });

  it('returns weak-signal for stale fixes', () => {
    const result = evaluateLocationProposalEligibility({
      location: {
        accuracyMeters: 18,
        capturedAtMs: 1_000,
        latitude: 53.9,
        longitude: 27.56,
      },
      nowMs: 60_000,
    });

    expect(result.status).toBe('weak-signal');
  });

  it('returns weak-signal for poor accuracy', () => {
    const result = evaluateLocationProposalEligibility({
      location: {
        accuracyMeters: 180,
        capturedAtMs: 1_000,
        latitude: 53.9,
        longitude: 27.56,
      },
      nowMs: 2_000,
    });

    expect(result.status).toBe('weak-signal');
  });
});

describe('getPermissionDeniedLocationProposalMessage', () => {
  it('explains blocked permission', () => {
    expect(getPermissionDeniedLocationProposalMessage('blocked')).toContain('blocked');
  });
});
