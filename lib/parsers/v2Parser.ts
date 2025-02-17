import { Dependency, Group, Parser, V2Manifest } from './types';
import { PkgInfo } from '@snyk/dep-graph';

export class V2Parser implements Parser {
  version = '2';
  manifest: V2Manifest;
  includeDevDependencies: boolean;

  constructor(manifest: V2Manifest, includeDevDependencies?: boolean) {
    this.manifest = manifest;
    this.includeDevDependencies = !!includeDevDependencies;
  }

  pkgInfoFrom(): PkgInfo {
    return {
      name: this.manifest.project.name,
      version: this.manifest.project.version,
    };
  }

  dependenciesFrom(): string[] {
    const newFormatDeps =
      this.manifest.project.dependencies.map((dep) => dep.split(' ')[0]) || [];
    const legacyFormatDeps = Object.keys(
      this.manifest.tool?.poetry?.dependencies || [],
    );
    return [...newFormatDeps, ...legacyFormatDeps];
  }

  getGroupDevDepNames(obj: Group): string[] {
    const groupDevDepNames = Object.values(obj)
      .map((group) => group.dependencies)
      .map((depsObj) => Object.keys(depsObj))
      .reduce((acc, curr) => [...acc, ...curr], []);

    return groupDevDepNames;
  }

  getAllDevDependencyNames(): string[] {
    // pre-v1.2.0 naming convention
    const devDepsProperty = Object.keys(
      this.manifest.tool?.poetry.group?.dev.dependencies ?? [],
    );
    const legacyDevDepsProperty = Object.keys(
      this.manifest.tool?.poetry['dev-dependencies'] ?? [],
    );
    // post-v1.2.0 dependency groups
    // https://python-poetry.org/docs/master/managing-dependencies
    // we will handle all tool.poetry.group.<group> as dev-deps
    const groupDevDepsProperty = this.manifest.tool?.poetry.group
      ? this.getGroupDevDepNames(this.manifest.tool?.poetry.group)
      : [];

    return [
      ...devDepsProperty,
      ...groupDevDepsProperty,
      ...legacyDevDepsProperty,
    ];
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
