import { PkgInfo } from '@snyk/dep-graph';
import { createManifestFileParser } from './utils';
import { Dependency } from './parsers/types';

export function pkgInfoFrom(manifestFileContents: string): PkgInfo {
  const parser = createManifestFileParser(manifestFileContents);
  return parser.pkgInfoFrom();
}

export function getDependenciesFrom(
  manifestFileContents: string,
  includeDevDependencies: boolean,
): Dependency[] {
  const parser = createManifestFileParser(
    manifestFileContents,
    includeDevDependencies,
  );
  return parser.getDependencies();
}
