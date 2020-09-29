export interface PoetryLockFile {
  package: Package[];
  metadata: Metadata;
}

export type Dependency = SpecificVersion | {
  markers: string;
  optional?: boolean;
  version: RangeVersion;
}

interface Package {
  category: 'dev' | 'main';
  description?: string;
  name: string;
  optional: boolean;
  'python-versions': string;
  version: SpecificVersion;
  dependencies?: Record<string, Dependency>;
  extras?: any;
}

type SpecificVersion = string; // i.e. "1.0.2"
type RangeVersion = string; // i.e. "^1.3", ">2", etc

interface Metadata {
  'content-hash': string;
  'lock-version': string;
  'python-versions': string;
  files: Record<string, File[]>;
}

interface File {
  file: string;
  hash: string;
}