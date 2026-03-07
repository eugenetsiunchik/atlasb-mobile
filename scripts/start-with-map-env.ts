import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import {
  DEFAULT_MAP_ENVIRONMENT,
  MAP_ENVIRONMENTS,
  type MapEnvironmentConfig,
  type MapEnvironmentName,
} from '../config/map-environments';

const requestedEnv =
  (process.argv[2] as MapEnvironmentName | undefined) ??
  DEFAULT_MAP_ENVIRONMENT;

const config = MAP_ENVIRONMENTS[requestedEnv];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function validateConfig(
  environmentName: string,
  environmentConfig: MapEnvironmentConfig | undefined,
): asserts environmentConfig is MapEnvironmentConfig {
  if (!environmentConfig) {
    const availableEnvs = Object.keys(MAP_ENVIRONMENTS).join(', ');
    fail(
      `Unknown map environment "${environmentName}". Available: ${availableEnvs}`,
    );
  }

  if (environmentName !== 'local' && !environmentConfig.baseUrl) {
    fail(
      `Map environment "${environmentName}" is missing baseUrl in config/map-environments.ts`,
    );
  }

  if (environmentConfig.baseUrl) {
    try {
      new URL(environmentConfig.baseUrl);
    } catch {
      fail(
        `Map environment "${environmentName}" has invalid baseUrl: ${environmentConfig.baseUrl}`,
      );
    }
  }
}

validateConfig(requestedEnv, config);

const outputPath = path.resolve(
  __dirname,
  '..',
  'src',
  'config',
  'activeMapEnvironment.ts',
);

const fileContents = `export type MapEnvironmentName = 'local' | 'staging' | 'prod';

export const activeMapEnvironment: {
  name: MapEnvironmentName;
  baseUrl: string | null;
} = {
  name: ${JSON.stringify(requestedEnv)},
  baseUrl: ${JSON.stringify(config.baseUrl ?? null)},
};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, fileContents);

console.log(
  `Using map environment "${requestedEnv}"${config.baseUrl ? ` (${config.baseUrl})` : ''}`,
);

const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['react-native', 'start', '--reset-cache'],
  {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  },
);

child.on('exit', code => {
  process.exit(code ?? 0);
});
