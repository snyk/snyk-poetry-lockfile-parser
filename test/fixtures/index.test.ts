import { readFixture } from './utils';
import { buildDepGraph } from '../../lib';
import { DepGraphBuilder } from '@snyk/dep-graph';

describe('buildDepGraph', () => {
  let depGraphBuilder: DepGraphBuilder;

  beforeEach(() => {
    depGraphBuilder = new DepGraphBuilder({ name: 'poetry' });
  });

  it('oneDepNoTransitives yields a graph with only package and its dep', () => {
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: 'six', version: '1.15.0' }, 'six')
      .connectDep(depGraphBuilder.rootNodeId, 'six')
      .build();

    expect(
      depGraphForScenarioAt('scenarios/one-dep-no-transitives').equals(
        expectedGraph,
      ),
    ).toBe(true);
  });

  it('oneDepWithTransitive yields graph with the two packages', () => {
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: 'jinja2', version: '2.11.2' }, 'jinja2')
      .connectDep(depGraphBuilder.rootNodeId, 'jinja2')
      .addPkgNode({ name: 'MarkupSafe', version: '1.1.1' }, 'MarkupSafe')
      .connectDep('jinja2', 'MarkupSafe')
      .build();

    expect(
      depGraphForScenarioAt('scenarios/one-dep-with-transitive').equals(
        expectedGraph,
      ),
    ).toBe(true);
  });

  describe('oneDepWithOneDevDep yields graph with two packages', () => {
    const scenarioPath = 'scenarios/one-dep-one-devdep';

    it('oneDepWithOneDevDep yields graph with two packages when including dev packages', () => {
      const includeDevDependencies = true;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.15.0' }, 'six')
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .addPkgNode({ name: 'isOdd', version: '0.1.2' }, 'isOdd')
        .connectDep(depGraphBuilder.rootNodeId, 'isOdd')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });

    it('oneDepWithOneDevDep yields graph with one package when ignoring dev packages', () => {
      const includeDevDependencies = false;
      const expectedGraph = depGraphBuilder
        .addPkgNode({ name: 'six', version: '1.15.0' }, 'six')
        .connectDep(depGraphBuilder.rootNodeId, 'six')
        .build();

      const isEqual = depGraphForScenarioAt(
        scenarioPath,
        includeDevDependencies,
      ).equals(expectedGraph);
      expect(isEqual).toBe(true);
    });
  });
});

function depGraphForScenarioAt(
  scenarioPath: string,
  includeDevDependencies = false,
) {
  const { manifestFileContents, lockFileContents } = readFixture(scenarioPath);
  return buildDepGraph(
    manifestFileContents,
    lockFileContents,
    includeDevDependencies,
  );
}
