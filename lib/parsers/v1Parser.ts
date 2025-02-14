import { Parser, V1Manifest } from './types';
import { Dependency, Group } from './types';
import { PkgInfo } from '@snyk/dep-graph';

export class V1Parser implements Parser {
  version = '1';
  manifest: V1Manifest;
  includeDevDependencies: boolean;

  constructor(manifest: V1Manifest, includeDevDependencies?: boolean) {
    this.manifest = manifest;
    this.includeDevDependencies = !!includeDevDependencies;
  }

  pkgInfoFrom(): PkgInfo {
    return {
      name: this.manifest.tool.poetry.name,
      version: this.manifest.tool.poetry.version,
    };
  }

  dependenciesFrom(): string[] {
    return Object.keys(this.manifest.tool.poetry.dependencies || []);
  }

  getGroupDevDepNames(obj: Group): string[] {
    return Object.values(obj)
      .map((group) => group.dependencies)
      .map((depsObj) => Object.keys(depsObj))
      .reduce((acc, curr) => [...acc, ...curr], []);
  }

  getAllDevDependencyNames(): string[] {
    // pre-v1.2.0 naming convention
    const devDepsProperty = Object.keys(
      this.manifest.tool.poetry['dev-dependencies'] ?? [],
    );
    // post-v1.2.0 dependency groups
    // https://python-poetry.org/docs/master/managing-dependencies
    // we will handle all tool.poetry.group.<group> as dev-deps
    const groupDevDepsProperty = this.manifest.tool?.poetry.group
      ? this.getGroupDevDepNames(this.manifest.tool?.poetry.group)
      : [];

    return [...devDepsProperty, ...groupDevDepsProperty];
  }

  getDependencies(): Dependency[] {
    const dependencies: Dependency[] = this.dependenciesFrom().map((dep) => ({
      name: dep,
      isDev: false,
    }));
    const devDependencies: Dependency[] = (
      this.includeDevDependencies ? this.getAllDevDependencyNames() : []
    ).map((devDep) => ({
      name: devDep,
      isDev: true,
    }));

    return [...dependencies, ...devDependencies].filter(
      (pkg) => pkg.name != 'python',
    );
  }
}
