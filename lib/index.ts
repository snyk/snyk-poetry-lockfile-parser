import * as toml from 'toml';
import { PoetryLockFile } from './types/poetry-lock-file-type';
import {
  PkgInfo,
  PkgManager,
  DepGraph,
  DepGraphBuilder,
} from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDev = false,
): DepGraph {
  if (!lockFileContents?.trim()) {
    throw new Error('lockFileContents is missing');
  }

  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);
  console.log(lockFile, manifestFile, includeDev);

  const pkgManager: PkgManager = { name: 'name' };
  const rootPkg: PkgInfo = { name: 'pkg' };
  const builder = new DepGraphBuilder(pkgManager, rootPkg);

  return builder.build();
}
