import * as toml from 'toml';
import { PoetryLockFile } from './types/poetry-lock-file-type';
import {
  PkgInfo,
  PkgManager,
  DepGraph,
  DepGraphBuilder,
} from '@snyk/dep-graph';
import { PoetryManifestType } from './types/poetry-manifest-type';
import { legacyPlugin as api } from '@snyk/cli-interface';
import debugModule = require('debug');

// To enable debugging output, use `snyk -d`
let logger: debugModule.Debugger | null = null;
function debugLog(s: string) {
  if (logger === null) {
    // Lazy init: Snyk CLI needs to process the CLI argument "-d" first.
    // TODO(BST-648): more robust handling of the debug settings
    if (process.env.DEBUG) {
      debugModule.enable(process.env.DEBUG);
    }
    logger = debugModule('snyk-gradle-plugin');
  }
  logger(s);
}

type Options = api.InspectOptions;

// Overload type definitions, so that when you call inspect() with an `options` literal (e.g. in tests),
// you will get a result of a specific corresponding type.
export async function inspect(
  root: string,
  targetFile: string,
  options?: api.SingleSubprojectInspectOptions,
): Promise<api.SinglePackageResult>;
export async function inspect(
  root: string,
  targetFile: string,
  options: api.MultiSubprojectInspectOptions,
): Promise<api.MultiProjectResult>;

// TODO: Specify result types vs any
// General implementation. The result type depends on the runtime type of `options`.
export async function inspect(
  root: string,
  targetFile: string,
  options?: Options,
): Promise<api.InspectResult> {
  debugLog(
    "Poetry inspect called with: " +
    JSON.stringify({
      root,
      targetFile,
      allSubProjects: (options as any)?.allSubProjects,
      subProject: (options as any)?.subProject,
    }),
  );

  const depGraph = new DepGraphBuilder({ name: 'poetry' }).build();

  return {
    plugin: { name: "plugin" },
    package: { },
    dependencyGraph: depGraph
  };
}


export function buildDepGraph(
  manifestFileContents: string,
  lockFileContents: string,
  includeDev = false,
): DepGraph {
  if (!lockFileContents?.trim()) {
    throw new Error('lockFileContents is missing');
  }

  const manifestFile: PoetryManifestType = toml.parse(manifestFileContents);
  const lockFile: PoetryLockFile = toml.parse(lockFileContents);
  console.log('manifestFile: ', manifestFile);
  console.log('lockFile: ', lockFile);

  const pkgManager: PkgManager = { name: 'poetry' };
  const builder = new DepGraphBuilder(pkgManager);

  const poetryDependencies = manifestFile.tool.poetry.dependencies;
  Object.keys(poetryDependencies).forEach((packageName: string) => {
    const pkg = lockFile.package.find((lockItem) => {
      return lockItem.name == packageName;
    });
    const pkgInfo = { name: packageName, version: pkg!.version }
    builder.addPkgNode(pkgInfo, packageName);
    builder.connectDep(builder.rootNodeId, packageName);
  });

  return builder.build();
}
