import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { PoetryLockFileDependency } from './lock-file-parser';
import { Dependency } from './manifest-parser';

// Poetry uses the virtualenv to create an environment and this comes with these
// packages pre-installed, therefore they won't be part of the lockfile.
// See: https://github.com/python-poetry/poetry/issues/3075#issuecomment-703334427
const IGNORED_DEPENDENCIES: string[] = [
  'setuptools',
  'distribute',
  'pip',
  'wheel',
];

export interface Labels {
  [key: string]: string | undefined;
  scope?: 'dev' | 'prod';
  pruned?: 'cyclic' | 'true';
}

export function build(
  pkgDetails: PkgInfo,
  dependencies: Dependency[],
  pkgSpecs: PoetryLockFileDependency[],
): DepGraph {
  const builder = new DepGraphBuilder({ name: 'poetry' }, pkgDetails);
  addDependenciesToGraph(dependencies, pkgSpecs, builder.rootNodeId, builder);
  return builder.build();
}

function addDependenciesToGraph(
  dependencies: Dependency[],
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  for (const dep of dependencies) {
    addDependenciesForPkg(dep, pkgSpecs, parentNodeId, builder);
  }
}

function addDependenciesForPkg(
  dependency: Dependency,
  pkgSpecs: PoetryLockFileDependency[],
  parentNodeId: string,
  builder: DepGraphBuilder,
) {
  const pkgName = dependency.name;
  if (IGNORED_DEPENDENCIES.includes(pkgName)) {
    return;
  }
  const pkg = pkgLockInfoFor(pkgName, pkgSpecs);
  if (!pkg) {
    return;
  }
  if (isPkgAlreadyInGraph(pkg, builder)) {
    builder.connectDep(parentNodeId, pkg.name);
    return;
  }

  const pkgInfo: PkgInfo = { name: pkg.name, version: pkg.version };
  const labels: Labels = {
    scope: dependency.isDev ? 'dev' : 'prod',
  };
  if (pkg.name != pkgName) {
    labels.pkgIdProvenance = pkgName;
  }
  builder
    .addPkgNode(pkgInfo, pkg.name, {
      labels,
    })
    .connectDep(parentNodeId, pkg.name);
  addDependenciesToGraph(
    pkg.dependencies.map((dep) => ({
      name: dep,
      isDev: dependency.isDev,
    })),
    pkgSpecs,
    pkg.name,
    builder,
  );
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
  // From PEP 426 https://www.python.org/dev/peps/pep-0426/#name
  // All comparisons of distribution names MUST be case insensitive, and MUST
  // consider hyphens and underscores to be equivalent
  const pkgLockInfo = pkgSpecs.find(
    (lockItem) =>
      lockItem.name.toLowerCase().replace(/_/g, '-') ===
        pkgName.toLowerCase().replace(/_/g, '-') ||
      lockItem.name.toLowerCase().replace(/-/g, '_') ===
        pkgName.toLowerCase().replace(/-/g, '_'),
  );

  if (!pkgLockInfo) {
    console.warn(
      `Could not find any lockfile metadata for package: ${pkgName}. This package will not be represented in the dependency graph.`,
    );
  }
  return pkgLockInfo;
}
