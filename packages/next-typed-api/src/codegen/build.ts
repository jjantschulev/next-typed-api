import { readFile, stat, writeFile } from 'fs/promises';
import { join } from 'path';
import { codegen } from './codegen';
import { getApiPaths, parseDir } from './parse-appdir';

export type BuildConfig = {
  basePath: string;
  reactQuery?: boolean;
  baseUrl?: string;
};

export async function build(config: BuildConfig) {
  const { basePath: cBasePath } = config;
  // Remove trailing slash from basePath
  const basePath = cBasePath.replace(/\/$/, '');

  const baseAppDir =
    (
      await stat(join(process.cwd(), 'app')).catch((_) => null)
    )?.isDirectory() ?? false;
  const srcAppDir =
    (
      await stat(join(process.cwd(), 'src', 'app')).catch((_) => null)
    )?.isDirectory() ?? false;

  if (!srcAppDir && !baseAppDir) {
    return console.log('Could not find app or src/app directory');
  }

  const startDir = baseAppDir
    ? join(process.cwd(), 'app')
    : join(process.cwd(), 'src', 'app');

  const appDir = await parseDir(startDir, null, {
    type: 'static',
    value: basePath,
  });
  const urls = appDir ? await getApiPaths(appDir) : [];

  const code = codegen(urls, startDir, config);

  await writeFile(join(startDir, 'next-typed-api-client.ts'), code, {
    encoding: 'utf-8',
  });
  await modifyGitignore();

  console.log('Generated next-typed-api-client.ts');
}

async function modifyGitignore() {
  try {
    const gitignorePath = join(process.cwd(), '.gitignore');
    const gitignore = await readFile(gitignorePath, { encoding: 'utf-8' });
    if (!gitignore.includes('next-typed-api-client.ts')) {
      await writeFile(
        gitignorePath,
        gitignore +
          '\n\n# Added by next-typed-api automatically\nnext-typed-api-client.ts\n',
        {
          encoding: 'utf-8',
        },
      );
    }
  } catch (error) {
    console.warn("Could not modify .gitignore. Maybe it doesn't exist?");
  }
}
