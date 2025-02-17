import { DepGraph, PkgInfo } from '@snyk/dep-graph';
import * as manifest from './manifest-parser';
import * as lockFile from './lock-file-parser';
import { PoetryLockFileDependency } from './lock-file-parser';
import * as poetryDepGraphBuilder from './poetry-dep-graph-builder';
import { Dependency } from './parsers/types';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDevDependencies = false,
): DepGraph {
  const dependencies: Dependency[] = manifest.getDependenciesFrom(
    manifestFileContents,
    includeDevDependencies,
  );
  const pkgDetails: PkgInfo = manifest.pkgInfoFrom(manifestFileContents);
  const pkgSpecs: PoetryLockFileDependency[] =
    lockFile.packageSpecsFrom(lockFileContents);
  return poetryDepGraphBuilder.build(pkgDetails, dependencies, pkgSpecs);
}
