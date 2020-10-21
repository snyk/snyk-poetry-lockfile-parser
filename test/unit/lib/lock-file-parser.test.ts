import {
  packageSpecsFrom,
  LockFileNotValid,
} from '../../../lib/lock-file-parser';

describe('when loading lockfile', () => {
  it('should throw exception if package stanza not found', () => {
    expect(() => packageSpecsFrom('')).toThrow(LockFileNotValid);
  });

  it('should parse a lockfile and return a list of its packages and their dependency names', () => {
    const fileContents = `[[package]]
      category = "main"
      name = "pkg_a"
      optional = false
      version = "2.11.2"
      
      [package.dependencies]
      pkg_b = ">=0.23"
      
      [[package]]
      category = "main"
      name = "pkg_b"
      optional = false
      version = "1.1.1"`;
    const lockFileDependencies = packageSpecsFrom(fileContents);
    expect(lockFileDependencies.length).toBe(2);
    expect(lockFileDependencies).toContainEqual({
      name: 'pkg_a',
      version: '2.11.2',
      dependencies: ['pkg_b'],
    });
    expect(lockFileDependencies).toContainEqual({
      name: 'pkg_b',
      version: '1.1.1',
      dependencies: [],
    });
  });

  it('should return an empty list when no packages are specified in file', () => {
    const lockFileDependencies = packageSpecsFrom('package = []');
    expect(lockFileDependencies.length).toBe(0);
  });
});
