import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import * as manifest from './manifest-parser';
import * as lockFile from './lock-file-parser';
import { PoetryLockFilePackageSpecification } from '../dist/types/poetry-lock-file-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDevDependencies = false,
): DepGraph {

  const dependencyNames = manifest.getDependencyNamesFrom(
    manifestFileContents,
    includeDevDependencies,
  );

  const pkgSpecs = lockFile.packageSpecsFrom(lockFileContents);

  const builder = new DepGraphBuilder({ name: 'poetry' });
  addDependenciesToGraph(dependencyNames, pkgSpecs, builder.rootNodeId, builder);
  return builder.build();
}

function addDependenciesToGraph(
  pkgNames: string[],
  pkgSpecs: PoetryLockFilePackageSpecification[],
  parentClientId: string,
  builder: DepGraphBuilder,
) {
  for (const pkgName of pkgNames) {
    addDependenciesFor(pkgName, pkgSpecs, parentClientId, builder);
  }
}

function addDependenciesFor(
  packageName: string,
  pkgSpecs: PoetryLockFilePackageSpecification[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
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

function pkgLockInfoFor(packageName: string, pkgSpecs: PoetryLockFilePackageSpecification[]) {
  return pkgSpecs.find((lockItem) => {
    return lockItem.name.toLowerCase() === packageName.toLowerCase();
  });
}

class DependencyNotFound extends Error {
  constructor(pkgName: string) {
    super(`Unable to find dependencies in poetry.lock for package: ${pkgName}`)
    this.name="DependencyNotFound"
  }
}

export type PoetryParsingError =
  manifest.ManifestFileNotValid | lockFile.LockFileNotValid | DependencyNotFound;
