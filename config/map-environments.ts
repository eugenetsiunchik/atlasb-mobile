export type MapEnvironmentName = 'local' | 'staging' | 'prod';

export type MapEnvironmentConfig = {
  baseUrl: string | null;
};

export const MAP_ENVIRONMENTS: Record<
  MapEnvironmentName,
  MapEnvironmentConfig
> = {
  local: {
    baseUrl: null,
  },
  staging: {
    baseUrl: 'http://176.223.129.1',
  },
  prod: {
    baseUrl: '',
  },
};

export const DEFAULT_MAP_ENVIRONMENT: MapEnvironmentName = 'local';
