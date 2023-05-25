import { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/dist/shared/lib/constants';
import { build, BuildConfig } from './build';

async function dev(buildConfig: BuildConfig) {
  await build(buildConfig);
  watchAllFiles(watchConfig, (event, file) => {
    console.log('DETECTED CHANGE!', event, file);
    build(buildConfig);
  });
}

function prod(buildConfig: BuildConfig) {
  return build(buildConfig);
}

export const withTypedApi =
  (
    next:
      | NextConfig
      | ((
          phase: string,
          args: { defaultConfig: NextConfig },
        ) => Promise<NextConfig>),
  ) =>
  async (phase: string, args: { defaultConfig: NextConfig }) => {
    const cfg = typeof next === 'function' ? await next(phase, args) : next;
    const buildConfig: BuildConfig = {
      basePath: cfg.basePath || '/',
    };
    if (phase === PHASE_DEVELOPMENT_SERVER) {
      await dev(buildConfig);
    } else {
      await prod(buildConfig);
    }
    return cfg;
  };

import { watch } from 'chokidar';

const watchConfig = {
  'add unlink change': ['app/**/route.ts', 'src/app/**/route.ts'],
};

function watchAllFiles(
  config: Record<string, string[]>,
  onTrigger: (event: string, file: string) => unknown,
) {
  Object.entries(config).forEach(([events, files]) => {
    const watcher = watch(files, { ignoreInitial: true });
    events
      .split(' ')
      .forEach((event) => watcher.on(event, (file) => onTrigger(event, file)));
  });
}

export default withTypedApi;
