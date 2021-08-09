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

function devDependenciesFrom(manifest: PoetryManifestType) {
  return Object.keys(manifest.tool.poetry['dev-dependencies'] || []);
}

function dependenciesFrom(manifest: PoetryManifestType) {
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

interface Poetry {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  'dev-dependencies': Record<string, string>;
}
