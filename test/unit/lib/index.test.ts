import {
  buildDepGraph,
  getDependencyInfoFrom,
  getDependencyNamesFrom,
} from '../../../lib';

describe('buildDepGraph', () => {
  describe('fileContents', () => {
    const testCases = [
      {
        value: '',
        description: 'empty',
      },
      {
        value: '  ',
        description: 'whitespace only',
      },
    ];

    testCases.forEach((testCase) => {
      it(`should throw an error if manifestFileContents value is ${testCase.description}`, () => {
        const lockFileContents = `[[package]]
          category = "main"
          name = "pkg_a"
          optional = false
          version = "2.11.2"`;
        const buildDepGraphInvocation = () => {
          buildDepGraph(testCase.value, lockFileContents);
        };
        expect(buildDepGraphInvocation).toThrowError();
      });
      it(`should throw an error if lockFileContents value is ${testCase.description}`, () => {
        const manifestFileContents = `[tool.poetry.dependencies]
          pkg_a = "^2.11"`;
        const buildDepGraphInvocation = () => {
          buildDepGraph(manifestFileContents, testCase.value);
        };
        expect(buildDepGraphInvocation).toThrowError();
      });
    });
  });

  it('should throw an error if its unable to find a dependency listed in pyproject.toml in poetry.lock', () => {
    const missingPackage = 'pkg_a';
    const manifestFileContents = `[tool.poetry.dependencies]
      ${missingPackage} = "^2.11"`;
    const lockFileContents = `[[package]]
      category = "main"
      name = "pkg_b"
      optional = false
      version = "1.1.1"`;
    const buildDepGraphInvocation = () => {
      buildDepGraph(manifestFileContents, lockFileContents);
    };
    expect(buildDepGraphInvocation).toThrowError(
      `Unable to find dependencies in poetry.lock for package: ${missingPackage}`,
    );
  });
});

describe('loading manifest files', () => {
  it('should parse file and return list of poetry dependency names', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      pkg_b = "^1.0"`;
    const poetryDependencies = getDependencyNamesFrom(fileContents, false);
    expect(poetryDependencies.length).toBe(2);
    expect(poetryDependencies.includes('pkg_a')).toBe(true);
    expect(poetryDependencies.includes('pkg_b')).toBe(true);
  });

  it('should not return python if listed as a dependency', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      python = "~2.7 || ^3.5"`;
    const poetryDependencies = getDependencyNamesFrom(fileContents, false);
    expect(poetryDependencies.length).toBe(1);
    expect(poetryDependencies.includes('pkg_a')).toBe(true);
    expect(poetryDependencies.includes('python')).toBe(false);
  });

  it('should include devDependencies when asked to', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      [tool.poetry.dev-dependencies]
      pkg_b = "^1.0"`;
    const poetryDependencies = getDependencyNamesFrom(fileContents, true);
    expect(poetryDependencies.length).toBe(2);
    expect(poetryDependencies.includes('pkg_a')).toBe(true);
    expect(poetryDependencies.includes('pkg_b')).toBe(true);
  });

  it('should not include devDependencies when not asked to', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      [tool.poetry.dev-dependencies]
      pkg_b = "^1.0"`;
    const poetryDependencies = getDependencyNamesFrom(fileContents, false);
    expect(poetryDependencies.length).toBe(1);
    expect(poetryDependencies.includes('pkg_a')).toBe(true);
    expect(poetryDependencies.includes('pkg_b')).toBe(false);
  });

  it('should not return any dependencies for an empty file', () => {
    const poetryDependencies = getDependencyNamesFrom('', true);
    expect(poetryDependencies.length).toBe(0);
  });
});

describe('loading lockfile', () => {
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
    const lockFileDependencies = getDependencyInfoFrom(fileContents);
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
    const lockFileDependencies = getDependencyInfoFrom('');
    expect(lockFileDependencies.length).toBe(0);
  });
});
