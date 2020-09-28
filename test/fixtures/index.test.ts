import { readFixture } from './utils';
import { buildDepGraph } from '../../lib';
import { DepGraphBuilder } from '@snyk/dep-graph';


describe('buildDepGraph', () => {

  let depGraphBuilder: DepGraphBuilder;

  beforeEach(() => {
    depGraphBuilder = new DepGraphBuilder({ name: "poetry" });
  });

  it('oneDepNoTransitives yields a graph with only package and its dep', async () => {
    const { manifestFileContents, lockFileContents } = readFixture('scenarios/one-dep-no-transitives');
    const actualGraph = await buildDepGraph(
      manifestFileContents,
      lockFileContents,
    );

    depGraphBuilder.addPkgNode({ name: "six", version: "1.15.0" }, "six");
    depGraphBuilder.connectDep(depGraphBuilder.rootNodeId, "six");
    const expectedGraph = depGraphBuilder.build();

    const areGraphsEqual = expectedGraph.equals(actualGraph);
    expect(areGraphsEqual).toBe(true);
  });

})
