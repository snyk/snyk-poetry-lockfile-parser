import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import * as manifest from './manifest-parser';
import * as lockFile from './lock-file-parser';
import { PoetryLockFileDependency } from './lock-file-parser';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDevDependencies = false,
): DepGraph {
  const dependencyNames = manifest.getDependencyNamesFrom(
    manifestFileContents,
    includeDevDependencies,
  );
  const packageDetails = manifest.pkgInfoFrom(manifestFileContents);
  const pkgSpecs = lockFile.packageSpecsFrom(lockFileContents);

  const builder = new DepGraphBuilder({ name: 'poetry' }, packageDetails);
  addDependenciesToGraph(
    dependencyNames,
    pkgSpecs,
    builder.rootNodeId,
    builder,
  );
  return builder.build();
}

function addDependenciesToGraph(
  pkgNames: string[],
  pkgSpecs: PoetryLockFileDependency[],
  parentClientId: string,
  builder: DepGraphBuilder,
) {
  for (const pkgName of pkgNames) {
    addDependenciesFor(pkgName, pkgSpecs, parentClientId, builder);
  }
}

function addDependenciesFor(
  packageName: string,
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  // Poetry will auto-resolve dependencies with hyphens to dashes, but keep transitive reference name with underscore
  packageName = packageName.replace(/_/g, '-');
  const pkg = pkgLockInfoFor(packageName, pkgSpecs);
  if (!pkg) {
    throw new DependencyNotFound(packageName);
  }
  const pkgInfo = { name: packageName, version: pkg.version };
  builder
    .addPkgNode(pkgInfo, packageName)
    .connectDep(parentNodeId, packageName);
  addDependenciesToGraph(pkg.dependencies, pkgSpecs, packageName, builder);
}

function pkgLockInfoFor(
  packageName: string,
  pkgSpecs: PoetryLockFileDependency[],
) {
  return pkgSpecs.find((lockItem) => {
    return lockItem.name.toLowerCase() === packageName.toLowerCase();
  });
}

class DependencyNotFound extends Error {
  constructor(pkgName: string) {
    super(`Unable to find dependencies in poetry.lock for package: ${pkgName}`);
    this.name = 'DependencyNotFound';
  }
}

export type PoetryParsingError =
  | manifest.ManifestFileNotValid
  | lockFile.LockFileNotValid
  | DependencyNotFound;
