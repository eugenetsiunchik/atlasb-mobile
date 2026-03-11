import { evaluateVisitVerification } from './visitVerificationService';

const place = {
  allowManualVisitMarking: true,
  latitude: 53.9045,
  longitude: 27.5615,
  name: 'Test Place',
  visitVerificationRadiusMeters: 150,
};

describe('evaluateVisitVerification', () => {
  it('returns verified when the user is within radius', () => {
    const result = evaluateVisitVerification({
      location: {
        accuracyMeters: 20,
        capturedAtMs: 1_000,
        latitude: 53.9051,
        longitude: 27.562,
      },
      nowMs: 2_000,
      place,
    });

    expect(result.status).toBe('verified');

    if (result.status === 'verified') {
      expect(result.record.verified).toBe(true);
      expect(result.record.method).toBe('gps');
    }
  });

  it('returns manual fallback when the user is too far away', () => {
    const result = evaluateVisitVerification({
      location: {
        accuracyMeters: 15,
        capturedAtMs: 1_000,
        latitude: 53.9205,
        longitude: 27.5908,
      },
      nowMs: 2_000,
      place,
    });

    expect(result.status).toBe('too-far');

    if (result.status === 'too-far') {
      expect(result.record?.verified).toBe(false);
      expect(result.record?.method).toBe('manual');
    }
  });

  it('returns weak-signal when the location fix is stale', () => {
    const result = evaluateVisitVerification({
      location: {
        accuracyMeters: 20,
        capturedAtMs: 1_000,
        latitude: 53.9051,
        longitude: 27.562,
      },
      nowMs: 50_000,
      place,
    });

    expect(result.status).toBe('weak-signal');
  });
});
