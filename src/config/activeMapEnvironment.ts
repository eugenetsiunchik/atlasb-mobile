export type MapEnvironmentName = 'local' | 'staging' | 'prod';

export const activeMapEnvironment: {
  name: MapEnvironmentName;
  baseUrl: string | null;
} = {
  name: 'local',
  baseUrl: null,
};
