import * as toml from '@iarna/toml';

export function pkgInfoFrom(manifestFileContents: string) {
  let manifest: PoetryManifestType;
  try {
    manifest = toml.parse(
      manifestFileContents,
    ) as unknown as PoetryManifestType;
    return {
      name: manifest.tool.poetry.name,
      version: manifest.tool.poetry.version,
    };
  } catch {
    throw new ManifestFileNotValid();
  }
}

export function getDependencyNamesFrom(
  manifestFileContents: string,
  includeDevDependencies: boolean,
): string[] {
  const manifest = toml.parse(
    manifestFileContents,
  ) as unknown as PoetryManifestType;
  if (!manifest.tool?.poetry) {
    throw new ManifestFileNotValid();
  }

  const dependencies = dependenciesFrom(manifest);
  const devDependencies: string[] = includeDevDependencies
    ? devDependenciesFrom(manifest)
    : [];

  return [...dependencies, ...devDependencies].filter(
    (pkgName) => pkgName != 'python',
  );
}

const getGroupDevDepNames = (obj: Group): string[] => {
  const groupDevDepNames = Object.values(obj)
    .map((group) => group.dependencies)
    .map((depsObj) => Object.keys(depsObj))
    .reduce((acc, curr) => [...acc, ...curr], []);

  return groupDevDepNames;
};

function getAllDevDependencyNames(manifest: PoetryManifestType): string[] {
  // pre-v1.2.0 naming convention
  const devDepsProperty = Object.keys(
    manifest.tool.poetry['dev-dependencies'] ?? [],
  );
  // post-v1.2.0 dependency groups
  // https://python-poetry.org/docs/master/managing-dependencies
  // we will handle all tool.poetry.group.<group> as dev-deps
  const groupDevDepsProperty = manifest.tool.poetry.group
    ? getGroupDevDepNames(manifest.tool.poetry.group)
    : [];

  return [...devDepsProperty, ...groupDevDepsProperty];
}

function devDependenciesFrom(manifest: PoetryManifestType): string[] {
  return getAllDevDependencyNames(manifest);
}

function dependenciesFrom(manifest: PoetryManifestType): string[] {
  return Object.keys(manifest.tool.poetry.dependencies || []);
}

export class ManifestFileNotValid extends Error {
  constructor() {
    super('pyproject.toml is not a valid poetry file.');
    this.name = 'ManifestFileNotValid';
  }
}

interface PoetryManifestType {
  tool: Tool;
}

interface Tool {
  poetry: Poetry;
}

type Dependencies = Record<string, string>;

type GroupDependencies = { dependencies: Dependencies }; // 'dependencies' is a required property

type Group = Record<string, GroupDependencies>;

interface Poetry {
  name: string;
  version: string;
  dependencies: Dependencies;
  'dev-dependencies': Dependencies;
  group: Group;
}
