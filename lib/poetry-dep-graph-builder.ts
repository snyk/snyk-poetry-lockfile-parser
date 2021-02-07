import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { PoetryLockFileDependency } from './lock-file-parser';

export function build(
  pkgDetails: PkgInfo,
  pkgDependencyNames: string[],
  pkgSpecs: PoetryLockFileDependency[],
): DepGraph {
  const builder = new DepGraphBuilder({ name: 'poetry' }, pkgDetails);
  addDependenciesToGraph(
    pkgDependencyNames,
    pkgSpecs,
    builder.rootNodeId,
    builder,
  );
  return builder.build();
}

export function addDependenciesToGraph(
  pkgNames: string[],
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  for (const pkgName of pkgNames) {
    addDependenciesForPkg(pkgName, pkgSpecs, parentNodeId, builder);
  }
}

export function addDependenciesForPkg(
  pkgName: string,
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  // Poetry will auto-resolve dependencies with hyphens to dashes, but keep transitive reference name with underscore
  pkgName = pkgName.replace(/_/g, '-');

  const pkg = pkgLockInfoFor(pkgName, pkgSpecs);
  if (isPkgAlreadyInGraph(pkg, builder)) {
    builder.connectDep(parentNodeId, pkgName);
    return;
  }

  const pkgInfo: PkgInfo = { name: pkgName, version: pkg.version };
  builder.addPkgNode(pkgInfo, pkgName).connectDep(parentNodeId, pkgName);
  addDependenciesToGraph(pkg.dependencies, pkgSpecs, pkgName, builder);
}

export function isPkgAlreadyInGraph(
  pkg: PoetryLockFileDependency,
  builder: DepGraphBuilder,
): boolean {
  const existingPkg = builder
    .getPkgs()
    .find(
      (existingPkg) =>
        existingPkg.name === pkg.name && existingPkg.version === pkg.version,
    );
  return !!existingPkg;
}

export function pkgLockInfoFor(
  pkgName: string,
  pkgSpecs: PoetryLockFileDependency[],
): PoetryLockFileDependency {
  const pkgLockInfo = pkgSpecs.find((lockItem) => {
    return lockItem.name.toLowerCase() === pkgName.toLowerCase();
  });

  if (pkgLockInfo === undefined) {
    throw new DependencyNotFound(pkgName);
  }
  return pkgLockInfo;
}

export class DependencyNotFound extends Error {
  constructor(pkgName: string) {
    super(`Unable to find dependencies in poetry.lock for package: ${pkgName}`);
    this.name = 'DependencyNotFound';
  }
}
