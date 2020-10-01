export interface PoetryLockFile {
  package: Package[];
  metadata: Metadata;
}

export interface PoetryLockFileDependency {
  name: string;
  version: string;
  dependencies: string[];
}

interface Package {
  category: 'dev' | 'main';
  description?: string;
  name: string;
  optional: boolean;
  'python-versions': string;
  version: string;
  dependencies?: Record<string, PoetryLockFileDependency>;
  extras?: any;
}

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
