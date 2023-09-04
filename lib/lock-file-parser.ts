import * as toml from '@iarna/toml';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

export function packageSpecsFrom(
  lockFileContents: string,
): PoetryLockFileDependency[] {
  let lockFile: PoetryLockFile;
  try {
    lockFile = toml.parse(lockFileContents) as unknown as PoetryLockFile;
  } catch {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The poetry.lock file is not parsable.',
    );
  }

  if (!lockFile.package) {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The poetry.lock file contains no package stanza.',
    );
  }

  return lockFile.package.map((pkg) => {
    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || []),
    };
  });
}

interface PoetryLockFile {
  package: Package[];
}

interface Package {
  name: string;
  version: string;
  dependencies?: Record<string, PoetryLockFileDependency>;
}

export interface PoetryLockFileDependency {
  name: string;
  version: string;
  dependencies: string[];
}
