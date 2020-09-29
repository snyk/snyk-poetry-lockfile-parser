import * as toml from 'toml';
import { PoetryLockFile, Dependency } from './types/poetry-lock-file-type';
import { DepGraph, DepGraphBuilder, PkgManager } from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
): DepGraph {
  if (!lockFileContents?.trim()) {
    throw new Error('lockFileContents is missing');
  }

  const packageDependencyNames = getDependencyNamesFrom(manifestFileContents);
  const packageDependencies = getDependenciesFrom(lockFileContents);

  const pkgManager: PkgManager = { name: 'poetry' };
  const builder = new DepGraphBuilder(pkgManager);

  packageDependencyNames.forEach(pkgName => {
    addDependenciesFor(pkgName, builder.rootNodeId);
  });

  return builder.build();

  function addDependenciesFor(packageName: string, parentNodeId: string) {
    const pkg = packageDependencies.find((lockItem) => {
      return lockItem.name.toLowerCase() === packageName.toLowerCase();
    });
    const pkgInfo = { name: packageName, version: pkg!.version };
    builder
      .addPkgNode(pkgInfo, packageName)
      .connectDep(parentNodeId, packageName);

    if (pkg) {
      pkg.dependencies
        .forEach((subPkgName: string) => {
          addDependenciesFor(subPkgName, packageName);
        });
    }
  }
}

export function getDependencyNamesFrom(manifestFileContents: string): string[] {
  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  if (!manifestFile?.tool?.poetry?.dependencies) {
    return [];
  }
  const poetryDependencies = Object.keys(manifestFile.tool.poetry.dependencies)
    .filter(pkgName => pkgName != 'python');
  return poetryDependencies;
}

export function getDependenciesFrom(lockFileContents: string): LockFileDependency[] {
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