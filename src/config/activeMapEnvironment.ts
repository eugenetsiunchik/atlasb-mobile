export type MapEnvironmentName = 'local' | 'staging' | 'prod';

export const activeMapEnvironment: {
  name: MapEnvironmentName;
  baseUrl: string | null;
} = {
  name: "staging",
  baseUrl: "http://176.223.129.1",
};
