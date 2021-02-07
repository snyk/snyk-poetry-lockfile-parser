import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { PoetryLockFileDependency } from './lock-file-parser';

// Poetry uses the virtualenv to create an environment and this comes with these
// packages pre-installed, therefore they won't be part of the lockfile.
// See: https://github.com/python-poetry/poetry/issues/3075#issuecomment-703334427
const IGNORED_DEPENDENCIES: string[] = [
  'setuptools',
  'distribute',
  'pip',
  'wheel',
];

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

function addDependenciesToGraph(
  pkgNames: string[],
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  for (const pkgName of pkgNames) {
    addDependenciesForPkg(pkgName, pkgSpecs, parentNodeId, builder);
  }
}

function addDependenciesForPkg(
  pkgName: string,
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  if (IGNORED_DEPENDENCIES.includes(pkgName)) {
    return;
  }
  // Poetry will auto-resolve dependencies with hyphens to dashes, but keep transitive reference name with underscore
  pkgName = pkgName.replace(/_/g, '-');

  const pkg = pkgLockInfoFor(pkgName, pkgSpecs);
  if (isPkgAlreadyInGraph(pkg, builder)) {
    return;
  }

  const pkgInfo: PkgInfo = { name: pkgName, version: pkg.version };
  builder.addPkgNode(pkgInfo, pkgName).connectDep(parentNodeId, pkgName);
  addDependenciesToGraph(pkg.dependencies, pkgSpecs, pkgName, builder);
}

function isPkgAlreadyInGraph(
  pkg: PoetryLockFileDependency,
  builder: DepGraphBuilder,
): boolean {
  return builder
    .getPkgs()
    .some(
      (existingPkg) =>
        existingPkg.name === pkg.name && existingPkg.version === pkg.version,
    );
}

function pkgLockInfoFor(
  pkgName: string,
  pkgSpecs: PoetryLockFileDependency[],
): PoetryLockFileDependency {
  const pkgLockInfo = pkgSpecs.find(
    (lockItem) => lockItem.name.toLowerCase() === pkgName.toLowerCase(),
  );

  if (!pkgLockInfo) {
    throw new DependencyNotFound(pkgName);
  }
  return pkgLockInfo;
}

export class DependencyNotFound extends Error {
  constructor(pkgName: string) {
    super(`Unable to find dependencies in poetry.lock for package: ${pkgName}`);
    this.name = DependencyNotFound.name;
  }
}
