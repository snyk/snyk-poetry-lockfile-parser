import { PkgInfo } from '@snyk/dep-graph';

export interface Parser {
  version: string;
  manifest: V2Manifest | V1Manifest;
  getDependencies(): Dependency[];
  pkgInfoFrom(): PkgInfo;
}

export interface V2Manifest {
  project: {
    name: string;
    version: string;
    description: string;
    authors: [
      {
        name: string;
        email: string;
      },
    ];
    readme: string;
    'requires-python': string;
    dependencies: string[];
  };
  'build-system': {
    requires: string[];
    'build-backend': string;
  };
  tool?: {
    poetry: {
      group?: Group;
      dependencies?: Dependencies;
      ['dev-dependencies']?: Dependencies;
    };
  };
}

export interface V1Manifest {
  tool: Tool;
}

export interface PoetryManifestType {
  project: any;
  tool: {
    poetry: any;
  };
}
export interface Tool {
  poetry: Poetry;
}

export type Dependencies = Record<string, string>;

export type GroupDependencies = { dependencies: Dependencies }; // 'dependencies' is a required property

export type Group = Record<string, GroupDependencies>;

export interface Poetry {
  name: string;
  version: string;
  dependencies: Dependencies;
  'dev-dependencies': Dependencies;
  group: Group;
}

export interface Dependency {
  name: string;
  isDev: boolean;
}
