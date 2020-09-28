import { readFixture } from '../utils';
import { buildDepGraph } from '../../lib';
import * as fs from 'fs';
import { DepGraphBuilder } from '@snyk/dep-graph';


describe('foo', () => {
  it('oneDepNoTransitives yields a graph with only package and its dep', async () => {
    const { manifestFileContents, lockFileContents } = readFixture('scenarios/one-dep-no-transitives');
    const depGraph = await buildDepGraph(
      manifestFileContents,
      lockFileContents,
    );

    const expectedGraph =
      new DepGraphBuilder({ name: 'poetry' }, { name: 'poetry-fixtures-project', version: "0.1.0"} )
      .build();


    expect(depGraph).toEqual(expectedGraph);
  })
})

// describe('buildDepGraph', () => {
//   const fixturesFolders = fs
//     .readdirSync(`${__dirname}`, { withFileTypes: true })
//     .filter((x) => x.isDirectory())
//     .map((x) => x.name);
//
//   fixturesFolders.forEach((folder) =>
//     it(`buildDepGraph for "${folder}" folder`, async (t) => {
//       const { manifestFileContents, lockFileContents } = readFixture(folder);
//       const depGraph = await buildDepGraph(
//         manifestFileContents,
//         lockFileContents,
//       );
//       expect(depGraph.getPkgs()).toMatchSnapshot();
//     }),
//   );
// });
