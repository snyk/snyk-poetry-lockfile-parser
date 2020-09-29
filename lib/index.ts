import * as toml from 'toml';
import { PoetryLockFile } from './types/poetry-lock-file-type';
import { DepGraph, DepGraphBuilder, PkgManager } from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
): DepGraph {
  if (!lockFileContents?.trim()) {
    throw new Error('lockFileContents is missing');
  }

  const poetryDependencies = getDependenciesFrom(manifestFileContents);
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);

  const pkgManager: PkgManager = { name: 'poetry' };
  const builder = new DepGraphBuilder(pkgManager);

  poetryDependencies.forEach(pkgName => {
    addDependenciesFor(pkgName, builder.rootNodeId);
  });

  return builder.build();

  function addDependenciesFor(packageName: string, parentNodeId: string) {
    const pkg = lockFile.package.find((lockItem) => {
      return lockItem.name.toLowerCase() === packageName.toLowerCase();
    });
    const pkgInfo = { name: packageName, version: pkg!.version };
    builder
      .addPkgNode(pkgInfo, packageName)
      .connectDep(parentNodeId, packageName);

    const childDependencies = pkg!.dependencies
    if (childDependencies) {
      Object.keys(childDependencies)
        .forEach((subPkgName: string) => {
          addDependenciesFor(subPkgName, packageName);
        })
    }
  }
}

export function getDependenciesFrom(manifestFileContents: string): string[] {
  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  if (!manifestFile?.tool?.poetry?.dependencies) {
    return [];
  }
  const poetryDependencies = Object.keys(manifestFile.tool.poetry.dependencies)
    .filter(pkgName => pkgName != 'python');
  return poetryDependencies;
}