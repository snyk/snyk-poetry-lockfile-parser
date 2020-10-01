export interface PoetryManifestType {
  'build-system': BuildSystem;
  tool: Tool;
}

interface BuildSystem {
  'build-backend': string;
  requires: string[];
}

interface Tool {
  black: any;
  isort: any;
  poetry: Poetry;
}

interface Poetry {
  authors: string[];
  classifiers: string[];
  description: string;
  documentation: string;
  homepage: string;
  keywords: string[];
  license: string;
  name: string;
  readme: string;
  repository: string;
  version: string;
  dependencies: Record<string, Dependency>;
  'dev-dependencies': Record<string, Dependency>;
  scripts: Record<string, string>;
}

type RangeVersion = string; // i.e. "^1.3", ">2", etc
type PythonRangeVersion = string; // i.e. "~2.7"

type Dependency = RangeVersion | DependencyObject | DependencyObject[];

interface DependencyObject {
  version: RangeVersion;
  python?: PythonRangeVersion;
  extras?: any;
}
