import * as fs from 'fs';

interface Fixture {
  manifestFileContents: string;
  lockFileContents: string;
}

export function readFixture(folderName: string): Fixture {
  return {
    "manifestFileContents": fs.readFileSync(`${__dirname}/fixtures/${folderName}/pyproject.toml`, 'utf8'),
    "lockFileContents": fs.readFileSync(`${__dirname}/fixtures/${folderName}/poetry.lock`, 'utf8'),
  };
}
