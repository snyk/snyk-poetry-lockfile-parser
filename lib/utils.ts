import * as toml from '@iarna/toml';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';
import {
  Parser,
  PoetryManifestType,
  V1Manifest,
  V2Manifest,
} from './parsers/types';
import { V1Parser } from './parsers/v1Parser';
import { V2Parser } from './parsers/v2Parser';

export const createManifestFileParser = (
  manifestFileContents: string,
  includeDevDependencies?: boolean,
): Parser => {
  let manifest;
  try {
    manifest = toml.parse(
      manifestFileContents,
    ) as unknown as PoetryManifestType;
  } catch (error) {
    throw new OpenSourceEcosystems.UnparseableManifestError(
      'The pyproject.toml file is not parsable.',
      { error },
    );
  }

  if (manifest.project) {
    return new V2Parser(
      manifest as unknown as V2Manifest,
      includeDevDependencies,
    );
  }

  if (manifest.tool?.poetry) {
    return new V1Parser(
      manifest as unknown as V1Manifest,
      includeDevDependencies,
    );
  }
  throw new OpenSourceEcosystems.UnparseableManifestError(
    'The pyproject.toml is not a valid poetry file.',
  );
};
