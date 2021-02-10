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

  const pkg = pkgLockInfoFor(pkgName, pkgSpecs);
  if (!pkg || isPkgAlreadyInGraph(pkg, builder)) {
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
): PoetryLockFileDependency | undefined {
  const pkgLockInfo = pkgSpecs.find(
    (lockItem) => lockItem.name.toLowerCase() === pkgName.toLowerCase(),
  );

  if (!pkgLockInfo) {
    console.warn(
      `Could not find any lockfile metadata for package: ${pkgName}. This package will not be represented in the dependency graph.`,
    );
  }
  return pkgLockInfo;
}
