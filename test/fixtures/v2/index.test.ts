import { readFixture } from '../utils';
import { buildDepGraph } from '../../../lib';
import { DepGraphBuilder } from '@snyk/dep-graph';

describe('buildDepGraph', () => {
  let depGraphBuilder: DepGraphBuilder;

  beforeEach(() => {
    depGraphBuilder = new DepGraphBuilder(
      { name: 'poetry' },
      { name: 'myPkg', version: '1.42.2' },
    );
  });

  it('should build a dep-graph with root node named and versioned as per project info in manifest file.', () => {
    const expectedGraph = depGraphBuilder.build();
    const manifestContents = `[tool.poetry]
      name = "myPkg"
      version = "1.42.2"`;
    const lockfileContents = `package = []`;

    let result = buildDepGraph(manifestContents, lockfileContents);
    expect(result.equals(expectedGraph)).toBeTruthy();
  });

  it('on fixture oneDepWithTransitive yields graph with the two packages', () => {
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: 'jinja2', version: '3.1.5' }, 'jinja2', {
        labels: { scope: 'prod' },
      })
      .connectDep(depGraphBuilder.rootNodeId, 'jinja2')
      .addPkgNode({ name: 'markupsafe', version: '3.0.2' }, 'markupsafe', {
        labels: { scope: 'prod', pkgIdProvenance: 'MarkupSafe@3.0.2' },
      })
      .connectDep('jinja2', 'markupsafe')
      .build();

    expect(
      depGraphForScenarioAt('scenarios/one-dep-with-transitive').equals(
        expectedGraph,
      ),
    ).toBe(true);
  });
  describe('on fixture oneDepWithOneDevDep yields graph with two packages', () => {
    const scenarioPath = 'scenarios/one-dep-one-devdep';

    it('oneDepWithOneDevDep yields graph with two packages when including dev packages', () => {
      const includeDevDependencies = true;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .addPkgNode({ name: 'isodd', version: '0.1.2' }, 'isodd', {
          labels: { scope: 'dev' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'isodd')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });

    it('on fixture oneDepWithOneDevDep yields graph with one package when ignoring dev packages', () => {
      const includeDevDependencies = false;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });
  });
  describe('on fixture oneDevDepWithOneDevDepGroup yields graph with two packages', () => {
    const scenarioPath = 'scenarios/one-dep-one-devdep-group';

    it('oneDevDepWithOneDevDepGroup yields graph with two packages when including dev packages', () => {
      const includeDevDependencies = true;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .addPkgNode({ name: 'isodd', version: '0.1.2' }, 'isodd', {
          labels: {
            scope: 'dev',
            // pkgIdProvenance: 'isOdd@0.1.2'
          },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'isodd')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });

    it('on fixture oneDevDepWithOneDevDepGroup yields graph with one package when ignoring dev packages', () => {
      const includeDevDependencies = false;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });
  });
  describe('on fixture oneDepWithOneDevDepAndMultipleDevDepGroups yields graph with three packages', () => {
    const scenarioPath = 'scenarios/one-dep-one-devdep-multiple-devdep-groups';

    it('oneDepWithOneDevDepAndMultipleDevDepGroups yields graph with three packages when including dev packages', () => {
      const includeDevDependencies = true;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .addPkgNode({ name: 'simple-enum', version: '0.0.6' }, 'simple-enum', {
          labels: { scope: 'dev' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'simple-enum')
        .addPkgNode({ name: 'whattype', version: '0.0.1' }, 'whattype', {
          labels: { scope: 'dev', pkgIdProvenance: 'whatType@0.0.1' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'whattype')
        .addPkgNode({ name: 'isodd', version: '0.1.2' }, 'isodd', {
          labels: { scope: 'dev', pkgIdProvenance: 'isOdd@0.1.2' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'isodd')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });

    it('on fixture oneDepWithOneDevDepAndMultipleDevDepGroups yields graph with one package when ignoring dev packages', () => {
      const includeDevDependencies = false;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.17.0' }, 'six', {
          labels: { scope: 'prod' },
        })
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });
  });
  it('on fixture circularDependency yields graph successfully', () => {
    const actualGraph = depGraphForScenarioAt('scenarios/circular-dependency');
    expect(actualGraph).toBeDefined();
    expect(actualGraph.getDepPkgs().length).toBe(13);
  });
  it('on fixture with unsafe package yields graph successfully', () => {
    // Package is in virtualenv and doesn't have an entry in poetry.lock
    const actualGraph = depGraphForScenarioAt('scenarios/unsafe-packages');
    expect(actualGraph).toBeDefined();
    expect(actualGraph.getDepPkgs().length).toBe(2);
  });
});

function depGraphForScenarioAt(
  scenarioPath: string,
  includeDevDependencies = false,
) {
  const { manifestFileContents, lockFileContents } = readFixture(
    __dirname,
    scenarioPath,
  );
  return buildDepGraph(
    manifestFileContents,
    lockFileContents,
    includeDevDependencies,
  );
}
