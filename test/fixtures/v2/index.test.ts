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

  it('on fixture oneOptionalDep yields graph', () => {
    const defaultDepGraph = (depGraphBuilder = new DepGraphBuilder(
      { name: 'poetry' },
      { name: 'dep-with-optional-dependency', version: '0.1.0' },
    ));
    const expectedGraph = defaultDepGraph
      .addPkgNode({ name: 'flask', version: '3.1.0' }, 'flask', {
        labels: { scope: 'prod' },
      })
      .connectDep(defaultDepGraph.rootNodeId, 'flask')
      .addPkgNode({ name: 'asgiref', version: '3.8.1' }, 'asgiref', {
        labels: { scope: 'prod' },
      })
      .connectDep('flask', 'asgiref')
      .addPkgNode(
        { name: 'typing-extensions', version: '4.12.2' },
        'typing-extensions',
        { labels: { scope: 'prod' } },
      )
      .connectDep('asgiref', 'typing-extensions')
      .addPkgNode({ name: 'blinker', version: '1.9.0' }, 'blinker', {
        labels: { scope: 'prod' },
      })
      .connectDep('flask', 'blinker')
      .addPkgNode({ name: 'click', version: '8.1.8' }, 'click', {
        labels: { scope: 'prod' },
      })
      .connectDep('flask', 'click')
      .addPkgNode({ name: 'colorama', version: '0.4.6' }, 'colorama', {
        labels: { scope: 'prod' },
      })
      .connectDep('click', 'colorama')
      .addPkgNode(
        { name: 'importlib-metadata', version: '8.5.0' },
        'importlib-metadata',
        { labels: { scope: 'prod' } },
      )
      .connectDep('flask', 'importlib-metadata')
      .addPkgNode({ name: 'zipp', version: '3.21.0' }, 'zipp', {
        labels: { scope: 'prod' },
      })
      .connectDep('importlib-metadata', 'zipp')
      .addPkgNode({ name: 'itsdangerous', version: '2.2.0' }, 'itsdangerous', {
        labels: { scope: 'prod' },
      })
      .connectDep('flask', 'itsdangerous')
      .addPkgNode({ name: 'jinja2', version: '3.1.5' }, 'jinja2', {
        labels: { scope: 'prod', pkgIdProvenance: 'Jinja2@3.1.5' },
      })
      .connectDep('flask', 'jinja2')
      .addPkgNode({ name: 'markupsafe', version: '3.0.2' }, 'markupsafe', {
        labels: { scope: 'prod', pkgIdProvenance: 'MarkupSafe@3.0.2' },
      })
      .connectDep('jinja2', 'markupsafe')
      .addPkgNode({ name: 'werkzeug', version: '3.1.3' }, 'werkzeug', {
        labels: { scope: 'prod', pkgIdProvenance: 'Werkzeug@3.1.3' },
      })
      .connectDep('flask', 'werkzeug')
      .connectDep('werkzeug', 'markupsafe')
      .build();

    const isEqual = depGraphForScenarioAt(
      'fixtures/v2/scenarios/dep-with-optional-dependency',
      true,
    ).equals(expectedGraph);
    expect(isEqual).toBe(true);
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
  it('should build depGraph for project with only dev deps', () => {
    const includeDevDependencies = true;
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: 'pytest', version: '7.4.4' }, 'pytest', {
        labels: { scope: 'dev' },
      })
      .connectDep(depGraphBuilder.rootNodeId, 'pytest')
      .addPkgNode({ name: 'colorama', version: '0.4.6' }, 'colorama', {
        labels: { scope: 'dev' },
      })
      .connectDep('pytest', 'colorama')
      .addPkgNode(
        { name: 'exceptiongroup', version: '1.2.2' },
        'exceptiongroup',
        { labels: { scope: 'dev' } },
      )
      .connectDep('pytest', 'exceptiongroup')
      .addPkgNode({ name: 'iniconfig', version: '2.0.0' }, 'iniconfig', {
        labels: { scope: 'dev' },
      })
      .connectDep('pytest', 'iniconfig')
      .addPkgNode({ name: 'packaging', version: '24.2' }, 'packaging', {
        labels: { scope: 'dev' },
      })
      .connectDep('pytest', 'packaging')
      .addPkgNode({ name: 'pluggy', version: '1.5.0' }, 'pluggy', {
        labels: { scope: 'dev' },
      })
      .connectDep('pytest', 'pluggy')
      .addPkgNode({ name: 'tomli', version: '2.2.1' }, 'tomli', {
        labels: { scope: 'dev' },
      })
      .connectDep('pytest', 'tomli')
      .build();

    const isEqual = depGraphForScenarioAt(
      'scenarios/dev-deps-only',
      includeDevDependencies,
    ).equals(expectedGraph);
    expect(isEqual).toBe(true);
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
