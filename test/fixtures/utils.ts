import * as fs from 'fs';

interface Fixture {
  manifestFileContents: string;
  lockFileContents: string;
}

export function readFixture(root: string, folderName: string): Fixture {
  return {
    manifestFileContents: fs.readFileSync(
      `${root}/${folderName}/pyproject.toml`,
      'utf8',
    ),
    lockFileContents: fs.readFileSync(
      `${root}/${folderName}/poetry.lock`,
      'utf8',
    ),
  };
}
