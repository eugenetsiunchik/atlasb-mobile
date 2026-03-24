import { resolvePlaceCoordinate } from './placeCoordinateResolution';

describe('resolvePlaceCoordinate', () => {
  it('keeps exact coordinates when geo is available', () => {
    const result = resolvePlaceCoordinate(
      {
        geo: {
          latitude: 53.9,
          longitude: 27.56,
        },
        settlementGeo: {
          latitude: 53.88,
          longitude: 27.5,
        },
      },
      'minsk',
    );

    expect(result).toEqual({
      approximateRadiusMeters: null,
      coordinatePrecision: 'exact',
      coordinateSource: 'geo',
      latitude: 53.9,
      longitude: 27.56,
      preciseLocationMissing: false,
    });
  });

  it('falls back to settlementGeo as an approximate coordinate', () => {
    const result = resolvePlaceCoordinate(
      {
        settlementGeo: {
          latitude: 52.1,
          longitude: 23.7,
        },
      },
      'brest',
    );

    expect(result).toEqual({
      approximateRadiusMeters: 6000,
      coordinatePrecision: 'approximate',
      coordinateSource: 'settlementGeo',
      latitude: 52.1,
      longitude: 23.7,
      preciseLocationMissing: true,
    });
  });

  it('falls back to a region center when no coordinate exists', () => {
    const result = resolvePlaceCoordinate({}, 'gomel');

    expect(result).toEqual({
      approximateRadiusMeters: 35000,
      coordinatePrecision: 'approximate',
      coordinateSource: 'regionCenter',
      latitude: 52.4345,
      longitude: 30.9754,
      preciseLocationMissing: true,
    });
  });

  it('returns null when no exact or approximate anchor is available', () => {
    expect(resolvePlaceCoordinate({}, 'unknown')).toBeNull();
  });
});
