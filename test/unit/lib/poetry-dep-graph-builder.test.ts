import { build } from '../../../lib/poetry-dep-graph-builder';
import { PoetryLockFileDependency } from '../../../lib/lock-file-parser';
import { PkgInfo } from '@snyk/dep-graph';

describe('poetry-dep-graph-builder', () => {
  const rootPkg: PkgInfo = { name: 'RootPkg', version: '1.0.0' };

  describe('build', () => {
    it('should return a graph of given dependencies successfully', () => {
      // given
      const pkgA = generatePoetryLockFileDependency('pkg-a');
      const pkgB = generatePoetryLockFileDependency('pkg_b', ['pkg-c']);
      const pkgC = generatePoetryLockFileDependency('pkg-c');
      const pkgSpecs: PoetryLockFileDependency[] = [pkgA, pkgB, pkgC];

      // when
      const result = build(rootPkg, ['pkg-a', 'pkg_b'], pkgSpecs);

      // then
      const resultGraph = result.toJSON().graph;
      expect(resultGraph.nodes).toHaveLength(4);
      const rootNode = resultGraph.nodes.find(
        (node) => node.pkgId === `${rootPkg.name}@${rootPkg.version}`,
      );
      expect(rootNode!.deps).toHaveLength(2);
      const nodeWithTransitive = resultGraph.nodes.find(
        (node) => node.nodeId === pkgB.name,
      );
      expect(nodeWithTransitive!.deps).toHaveLength(1);
      expect(nodeWithTransitive!.deps[0].nodeId).toBe(pkgC.name);
    });

    it('should ignore poetry installed virtualenv packages as transitives', () => {
      // given
      const pkgA = generatePoetryLockFileDependency('pkg-a');
      const wheel = generatePoetryLockFileDependency('wheel');
      const setuptools = generatePoetryLockFileDependency('setuptools');
      const distribute = generatePoetryLockFileDependency('distribute');
      const pip = generatePoetryLockFileDependency('pip');
      pkgA.dependencies = [
        wheel.name,
        setuptools.name,
        distribute.name,
        pip.name,
      ];

      // when
      const result = build(rootPkg, [pkgA.name], [pkgA]);

      // then
      const resultGraph = result.toJSON().graph;
      expect(resultGraph.nodes).toHaveLength(2);
      const nodeWithVirtualEnvDeps = resultGraph.nodes.find(
        (node) => node.nodeId === pkgA.name,
      );
      expect(nodeWithVirtualEnvDeps!.deps).toHaveLength(0);
    });

    it('should not add node twice when there are circular dependencies', () => {
      // given
      const pkgA = generatePoetryLockFileDependency('pkg-a', ['pkg-b']);
      const pkgB = generatePoetryLockFileDependency('pkg-b', ['pkg-a']);
      const pkgC = generatePoetryLockFileDependency('pkg-c', ['pkg-a']);

      // when
      const result = build(
        rootPkg,
        [pkgA.name, pkgB.name, pkgC.name],
        [pkgA, pkgB, pkgC],
      );

      // then
      expect(result).toBeDefined();
      const aNodes = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
      const bNodes = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgB.name);
      const cNode = result
        .toJSON()
        .graph.nodes.find((node) => node.nodeId === pkgC.name);
      expect(aNodes).toHaveLength(1);
      expect(bNodes).toHaveLength(1);
      expect(cNode).toBeDefined();
      expect(cNode!.deps).toHaveLength(1);
    });

    it('should treat underscores in manifest as equal to hyphens in lockfile', () => {
      // given
      const pkgA = generatePoetryLockFileDependency('pkg-a');

      // when
      const result = build(rootPkg, ['pkg_a'], [pkgA]);

      // then
      expect(result).toBeDefined();
      const hyphenatedNode = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
    });

    it('should treat hyphens in manifest as equal to underscores in lockfile', () => {
      // given
      const pkgA = generatePoetryLockFileDependency('pkg_a');

      // when
      const result = build(rootPkg, ['pkg-a'], [pkgA]);

      // then
      expect(result).toBeDefined();
      const hyphenatedNode = result
        .toJSON()
        .graph.nodes.filter((node) => node.nodeId === pkgA.name);
    });

    it('should log warning if metadata cannot be found in pkgSpecs', () => {
      // given
      const missingPkg = 'non-existent-pkg';
      const pkgA = generatePoetryLockFileDependency('pkg-a', [
        'non-existent-pkg',
      ]);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // when
      build(rootPkg, [pkgA.name], [pkgA]);

      // then
      const expectedWarningMessage = `Could not find any lockfile metadata for package: ${missingPkg}. This package will not be represented in the dependency graph.`;
      expect(consoleSpy).toBeCalledWith(expectedWarningMessage);
    });
  });
});

function generatePoetryLockFileDependency(
  pkgName: string,
  dependencies: string[] = [],
): PoetryLockFileDependency {
  return { name: pkgName, version: '1.0.0', dependencies: dependencies };
}
