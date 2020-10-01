import * as toml from 'toml';
import { Dependency, PoetryLockFile } from './types/poetry-lock-file-type';
import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
): DepGraph {
  if (!lockFileContents?.trim()) {
    throw new Error('lockFileContents is missing');
  }

  const dependencyNames = getDependencyNamesFrom(manifestFileContents);
  const dependencyInfos = getDependencyInfoFrom(lockFileContents);

  const builder = new DepGraphBuilder({ name: 'poetry' });
  addDependenciesToGraph(dependencyNames, builder.rootNodeId, builder);
  return builder.build();

  function addDependenciesToGraph(pkgNames: string[], parentClientId: string, builder: DepGraphBuilder) {
    pkgNames.forEach(pkgName => {
      addDependenciesFor(pkgName, parentClientId, builder);
    });
  }

  function pkgInfoFor(packageName: string) {
    return dependencyInfos.find((lockItem) => {
      return lockItem.name.toLowerCase() === packageName.toLowerCase();
    });
  }

  function addDependenciesFor(packageName: string, parentNodeId: string, builder: DepGraphBuilder) {
    const pkg = pkgInfoFor(packageName);
    const pkgInfo = { name: packageName, version: pkg!.version };
    builder.addPkgNode(pkgInfo, packageName).connectDep(parentNodeId, packageName);
    if (pkg) {
      addDependenciesToGraph(pkg.dependencies, packageName, builder)
    }
  }
}

export function getDependencyNamesFrom(manifestFileContents: string): string[] {
  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  return Object.keys(manifestFile.tool?.poetry?.dependencies || [])
    .filter(pkgName => pkgName != 'python');
}

export function getDependencyInfoFrom(lockFileContents: string): LockFileDependency[] {
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);
  if (!lockFile?.package) {
    return [];
  }
  return lockFile.package.map((pkg) => {
    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: getDependencyNamesFromLockFile(pkg.dependencies)
    }
  });
}

function getDependencyNamesFromLockFile(record: Record<string, Dependency> | undefined): string[] {
  if (!record) {
    return [];
  }
  return Object.keys(record);
}

export interface LockFileDependency {
  name: string,
  version: string,
  dependencies: string[]
}
