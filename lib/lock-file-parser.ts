import * as toml from '@iarna/toml';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';
import {
  LockFileEntryFile,
  LockFileEntrySource,
} from './component-metadata-labels';

export function packageSpecsFrom(
  lockFileContents: string,
): PoetryLockFileDependency[] {
  let lockFile: PoetryLockFile;
  try {
    lockFile = toml.parse(lockFileContents) as unknown as PoetryLockFile;
  } catch (error) {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The poetry.lock file is not parsable.',
      { error },
    );
  }

  if (!lockFile.package) {
    throw new OpenSourceEcosystems.UnparseableLockFileError(
      'The poetry.lock file contains no package stanza.',
    );
  }

  // In lock-version 1.x hashes live in a separate `[metadata.files]` table keyed by package
  // name; in 2.x they are inline as `files` on each `[[package]]`. Support both.
  const metadataFiles = metadataFilesIndex(lockFile.metadata?.files);

  return lockFile.package.map((pkg) => {
    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || []),
      files: pkg.files ?? metadataFiles[pkg.name.toLowerCase()] ?? [],
      source: pkg.source,
    };
  });
}

// Index the v1 `[metadata.files]` table case-insensitively so it can be joined back to each
// package regardless of name casing.
function metadataFilesIndex(
  files?: Record<string, LockFileEntryFile[]>,
): Record<string, LockFileEntryFile[]> {
  const index: Record<string, LockFileEntryFile[]> = {};
  for (const [name, entries] of Object.entries(files || {})) {
    index[name.toLowerCase()] = entries;
  }
  return index;
}

interface PoetryLockFile {
  package: Package[];
  metadata?: {
    files?: Record<string, LockFileEntryFile[]>;
  };
}

interface Package {
  name: string;
  version: string;
  dependencies?: Record<string, PoetryLockFileDependency>;
  files?: LockFileEntryFile[];
  source?: LockFileEntrySource;
}

export interface PoetryLockFileDependency {
  name: string;
  version: string;
  dependencies: string[];
  files?: LockFileEntryFile[];
  source?: LockFileEntrySource;
}
