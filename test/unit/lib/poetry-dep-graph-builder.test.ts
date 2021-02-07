import {
  addDependenciesForPkg,
  DependencyNotFound,
  isPkgAlreadyInGraph,
  pkgLockInfoFor,
} from '../../../lib/poetry-dep-graph-builder';
import { PoetryLockFileDependency } from '../../../lib/lock-file-parser';
import { DepGraphBuilder, PkgInfo, PkgManager } from '@snyk/dep-graph';

describe('poetry-dep-graph-builder', () => {
  const pkgA: PoetryLockFileDependency = {
    name: 'pkg-a',
    version: '1.0',
    dependencies: [],
  };
  const pkgB: PoetryLockFileDependency = {
    name: 'pkg-b',
    version: '2.0',
    dependencies: [],
  };
  let pkgSpecs: PoetryLockFileDependency[] = [pkgA, pkgB];

  describe('addDependenciesForPkg', () => {
    let builder: DepGraphBuilder;
    let rootPkg: PkgInfo;
    beforeEach(() => {
      rootPkg = { name: 'TestPkg', version: '1.0' };
      const pkgManager: PkgManager = { name: 'Poetry' };
      builder = new DepGraphBuilder(pkgManager, rootPkg);
    });

    it('should addPkgNode and connectDep if pkg is new to graph', () => {
      // given
      builder.addPkgNode = jest.fn().mockReturnThis();
      builder.connectDep = jest.fn();

      // when
      addDependenciesForPkg(pkgA.name, pkgSpecs, rootPkg.name, builder);

      // then
      expect(builder.connectDep).toHaveBeenCalledWith(rootPkg.name, pkgA.name);
      const expectedPkgInfo: PkgInfo = {
        name: pkgA.name,
        version: pkgA.version,
      };
      expect(builder.addPkgNode).toHaveBeenCalledWith(
        expectedPkgInfo,
        pkgA.name,
      );
    });

    it('should only connect nodes if pkg already exists', () => {
      // given
      builder.addPkgNode(pkgA, rootPkg.name);
      builder.connectDep = jest.fn();
      builder.addPkgNode = jest.fn();

      // when
      addDependenciesForPkg(pkgA.name, pkgSpecs, rootPkg.name, builder);

      // then
      expect(builder.connectDep).toHaveBeenCalledWith(rootPkg.name, pkgA.name);
      expect(builder.addPkgNode).not.toHaveBeenCalled();
    });
  });

  describe('isPkgAlreadyInGraph', () => {
    let builder: DepGraphBuilder;
    beforeEach(() => {
      const rootPkg: PkgInfo = { name: 'TestPkg', version: '1.0' };
      const pkgManager: PkgManager = { name: 'Poetry' };
      builder = new DepGraphBuilder(pkgManager, rootPkg);
      builder.addPkgNode(pkgA, pkgA.name);
      builder.addPkgNode(pkgB, pkgB.name);
    });

    it('should return true if pkg has already been added to builder', () => {
      // given / when
      const result = isPkgAlreadyInGraph(pkgA, builder);

      // then
      expect(result).toBeTruthy();
    });

    it('should return false if pkg has not already been added to builder', () => {
      // given
      const pkgC: PoetryLockFileDependency = {
        name: 'pkg-c',
        version: '3.0',
        dependencies: [],
      };

      // when
      const result = isPkgAlreadyInGraph(pkgC, builder);

      // then
      expect(result).toBeFalsy();
    });

    it('should return false if pkgName exists but no matching version', () => {
      // given
      const alternatePkgB: PoetryLockFileDependency = {
        name: pkgB.name,
        version: '1.0',
        dependencies: [],
      };

      // when
      const result = isPkgAlreadyInGraph(alternatePkgB, builder);

      // then
      expect(result).toBeFalsy();
    });
  });

  describe('pkgLockInfoFor', () => {
    let pkgSpecs: PoetryLockFileDependency[] = [];
    const pkgC: PoetryLockFileDependency = {
      name: 'pkg-C',
      version: '3.0',
      dependencies: [],
    };
    beforeEach(() => {
      pkgSpecs = [pkgA, pkgB, pkgC];
    });

    it('should retrieve correct item from pkgSpecs when pkgName exists', () => {
      // given
      const pkgName = 'pkg-b';

      // when
      const result = pkgLockInfoFor(pkgName, pkgSpecs);

      // then
      expect(result).toEqual(pkgB);
    });

    it('should retrieve correct item ignoring case sensitivity', () => {
      // given
      const pkgName = 'PKG-c';

      // when
      const result = pkgLockInfoFor(pkgName, pkgSpecs);

      // then
      expect(result).toEqual(pkgC);
    });

    it('should throw DependencyNotFound if pkgName does not exist in pkgSpecs', () => {
      // given
      const pkgName = 'pkg-d';

      // when
      const errorResult = () => {
        pkgLockInfoFor(pkgName, pkgSpecs);
      };

      // then
      expect(errorResult).toThrow(DependencyNotFound);
    });
  });
});
