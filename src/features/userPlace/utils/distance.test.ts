import { getDistanceBetweenCoordinatesMeters } from './distance';

describe('getDistanceBetweenCoordinatesMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(
      getDistanceBetweenCoordinatesMeters(
        {
          latitude: 53.9,
          longitude: 27.5667,
        },
        {
          latitude: 53.9,
          longitude: 27.5667,
        },
      ),
    ).toBe(0);
  });

  it('calculates a realistic distance between two points', () => {
    const distanceMeters = getDistanceBetweenCoordinatesMeters(
      {
        latitude: 53.9045,
        longitude: 27.5615,
      },
      {
        latitude: 53.9105,
        longitude: 27.5768,
      },
    );

    expect(distanceMeters).toBeGreaterThan(1_200);
    expect(distanceMeters).toBeLessThan(1_400);
  });
});
