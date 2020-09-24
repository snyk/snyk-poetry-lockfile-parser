import { readFixture } from '../utils';
import { buildDepGraph } from '../../lib';
import * as fs from 'fs';

describe('buildDepGraph', () => {
  const fixturesFolders = fs
    .readdirSync(`${__dirname}/fixtures`, { withFileTypes: true })
    .filter((x) => x.isDirectory())
    .map((x) => x.name);

  fixturesFolders.forEach((folder) =>
    it(`buildDepGraph for "${folder}" folder`, async (t) => {
      const { manifestFileContents, lockFileContents } = readFixture(folder);
      const depGraph = await buildDepGraph(
        manifestFileContents,
        lockFileContents,
      );
      expect(depGraph.getPkgs()).toMatchSnapshot();
    }),
  );
});
