import { packageSpecsFrom } from '../../../lib/lock-file-parser';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

describe('when loading lockfile', () => {
  it('should throw LockFileNotValid if toml parsing throws an error', () => {
    const fileContents = `[[package]
      category = 'main"`;
    expect(() => packageSpecsFrom(fileContents)).toThrow(
      OpenSourceEcosystems.UnparseableLockFileError,
    );
  });
  it('should throw exception if package stanza not found', () => {
    expect(() => packageSpecsFrom('')).toThrow(
      OpenSourceEcosystems.UnparseableLockFileError,
    );
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
    expect(lockFileDependencies).toContainEqual(
      expect.objectContaining({
        name: 'pkg_a',
        version: '2.11.2',
        dependencies: ['pkg_b'],
      }),
    );
    expect(lockFileDependencies).toContainEqual(
      expect.objectContaining({
        name: 'pkg_b',
        version: '1.1.1',
        dependencies: [],
      }),
    );
  });

  it('reads inline `files` (lock v2) and `[package.source]` onto each package', () => {
    const fileContents = `[[package]]
      name = "pkg_a"
      version = "1.0.0"
      files = [
        {file = "pkg_a-1.0.0-py3-none-any.whl", hash = "sha256:aaaa"},
        {file = "pkg_a-1.0.0.tar.gz", hash = "sha256:bbbb"},
      ]

      [package.source]
      type = "legacy"
      url = "https://index.example/simple"
      reference = "internal"`;
    const [pkg] = packageSpecsFrom(fileContents);
    expect(pkg.files).toEqual([
      { file: 'pkg_a-1.0.0-py3-none-any.whl', hash: 'sha256:aaaa' },
      { file: 'pkg_a-1.0.0.tar.gz', hash: 'sha256:bbbb' },
    ]);
    expect(pkg.source).toEqual({
      type: 'legacy',
      url: 'https://index.example/simple',
      reference: 'internal',
    });
  });

  it('joins the v1 `[metadata.files]` table back to each package (case-insensitive)', () => {
    const fileContents = `[[package]]
      name = "Pkg_A"
      version = "1.0.0"

      [metadata]
      lock-version = "1.0"

      [metadata.files]
      pkg_a = [
        {file = "Pkg_A-1.0.0.tar.gz", hash = "sha256:cccc"},
      ]`;
    const [pkg] = packageSpecsFrom(fileContents);
    expect(pkg.files).toEqual([
      { file: 'Pkg_A-1.0.0.tar.gz', hash: 'sha256:cccc' },
    ]);
  });

  it('should return an empty list when no packages are specified in file', () => {
    const lockFileDependencies = packageSpecsFrom('package = []');
    expect(lockFileDependencies.length).toBe(0);
  });
});
