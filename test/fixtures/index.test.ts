import { readFixture } from './utils';
import { buildDepGraph } from '../../lib';
import { DepGraphBuilder } from '@snyk/dep-graph';

describe('buildDepGraph', () => {
  let depGraphBuilder: DepGraphBuilder;

  beforeEach(() => {
    depGraphBuilder = new DepGraphBuilder({ name: "poetry" });
  });

  it('oneDepWithTransitive yields graph with the two packages', async() => {
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: "jinja2", version: "2.11.2" }, "jinja2")
      .connectDep(depGraphBuilder.rootNodeId, "jinja2")
      .addPkgNode({ name: "MarkupSafe", version: "1.1.1" }, "MarkupSafe")
      .connectDep("jinja2", "MarkupSafe").build();

    expect((depGraphForScenarioAt('scenarios/one-dep-with-transitive'))
      .equals(expectedGraph)).toBe(true);
  })

  it('oneDepNoTransitives yields a graph with only package and its dep', async () => {
    const expectedGraph = depGraphBuilder
      .addPkgNode({ name: "six", version: "1.15.0" }, "six")
      .connectDep(depGraphBuilder.rootNodeId, "six").build();

    expect(depGraphForScenarioAt('scenarios/one-dep-no-transitives')
      .equals(expectedGraph)).toBe(true);
  });
})

function depGraphForScenarioAt(scenarioPath: string) {
  const { manifestFileContents, lockFileContents } = readFixture(scenarioPath);
  return buildDepGraph(
    manifestFileContents,
    lockFileContents,
  );
}

