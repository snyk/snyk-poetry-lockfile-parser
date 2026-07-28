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

  // poetry 1.x (lock v1 family) records a `[package.source]` stanza for a configured index
  // just as 2.x does, including for a custom *primary/default* source. Verified against
  // poetry 1.1.15: a `default = true` source yields `type = "legacy"` with its own root.
  // This matters because the absence of a source stanza is what we treat as "built-in
  // PyPI" — a v1 lock resolved from a private index must not look bare.
  it('reads `[package.source]` alongside the v1 `[metadata.files]` layout', () => {
    const fileContents = `[[package]]
      category = "main"
      name = "internal-lib"
      optional = false
      version = "2.3.0"

      [package.source]
      type = "legacy"
      url = "https://artifactory.internal.example/api/pypi/pypi-remote/simple"
      reference = "internal"

      [metadata]
      lock-version = "1.1"

      [metadata.files]
      internal-lib = [
        {file = "internal_lib-2.3.0-py3-none-any.whl", hash = "sha256:aaaa"},
      ]`;
    const [pkg] = packageSpecsFrom(fileContents);
    expect(pkg.files).toEqual([
      { file: 'internal_lib-2.3.0-py3-none-any.whl', hash: 'sha256:aaaa' },
    ]);
    expect(pkg.source).toEqual({
      type: 'legacy',
      url: 'https://artifactory.internal.example/api/pypi/pypi-remote/simple',
      reference: 'internal',
    });
  });

  it('should return an empty list when no packages are specified in file', () => {
    const lockFileDependencies = packageSpecsFrom('package = []');
    expect(lockFileDependencies.length).toBe(0);
  });
});
