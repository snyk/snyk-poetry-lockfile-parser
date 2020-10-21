import * as toml from 'toml';

export function packageSpecsFrom(
  lockFileContents: string,
): PoetryLockFileDependency[] {
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);
  if (!lockFile.package) {
    throw new LockFileNotValid();
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

export class LockFileNotValid extends Error {
  constructor() {
    super("The poetry.lock file contains no package stanza'");
    this.name = 'LockFileNotValid';
  }
}
