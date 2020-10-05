import * as toml from 'toml';
import {
  PoetryLockFileDependency,
  PoetryLockFile,
} from './types/poetry-lock-file-type';
import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';

export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDevDependencies = false,
): DepGraph {
  if (!manifestFileContents?.trim()) {
    throw new Error('The pyproject.toml is empty');
  }
  if (!lockFileContents?.trim()) {
    throw new Error('The poetry.lock is empty');
  }

  const dependencyNames = getDependencyNamesFrom(
    manifestFileContents,
    includeDevDependencies,
  );
  const dependencyInfos = getDependencyInfoFrom(lockFileContents);

  const builder = new DepGraphBuilder({ name: 'poetry' });
  addDependenciesToGraph(dependencyNames, builder.rootNodeId, builder);
  return builder.build();

  function addDependenciesToGraph(
    pkgNames: string[],
    parentClientId: string,
    builder: DepGraphBuilder,
  ) {
    for (const pkgName of pkgNames) {
      addDependenciesFor(pkgName, parentClientId, builder);
    }
  }

  function addDependenciesFor(
    packageName: string,
    parentNodeId: string,
    builder: DepGraphBuilder,
  ) {
    const pkg = pkgLockInfoFor(packageName);
    if (!pkg) {
      throw new Error(
        `Unable to find dependencies in poetry.lock for package: ${packageName}`,
      );
    }
    const pkgInfo = { name: packageName, version: pkg.version };
    builder
      .addPkgNode(pkgInfo, packageName)
      .connectDep(parentNodeId, packageName);
    addDependenciesToGraph(pkg.dependencies, packageName, builder);
  }

  function pkgLockInfoFor(packageName: string) {
    return dependencyInfos.find((lockItem) => {
      return lockItem.name.toLowerCase() === packageName.toLowerCase();
    });
  }
}

export function getDependencyNamesFrom(
  manifestFileContents: string,
  includeDevDependencies: boolean,
): string[] {
  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  const dependencies = Object.keys(
    manifestFile.tool?.poetry?.dependencies || [],
  );
  let devDependencies: string[] = [];
  if (includeDevDependencies) {
    devDependencies = Object.keys(
      manifestFile.tool?.poetry?.['dev-dependencies'] || [],
    );
  }
  // TODO: Do we want to ignore python or can this be removed?
  return [...dependencies, ...devDependencies].filter(
    (pkgName) => pkgName != 'python',
  );
}

export function getDependencyInfoFrom(
  lockFileContents: string,
): PoetryLockFileDependency[] {
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);
  if (!lockFile?.package) {
    return [];
  }
  return lockFile.package.map((pkg) => {
    return {
      name: pkg.name,
      version: pkg.version,
      dependencies: Object.keys(pkg.dependencies || []),
    };
  });
}
