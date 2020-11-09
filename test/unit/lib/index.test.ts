import { buildDepGraph } from '../../../lib';

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
          name = "pkg-a"
          optional = false
          version = "2.11.2"`;
        const buildDepGraphInvocation = () => {
          buildDepGraph(testCase.value, lockFileContents);
        };
        expect(buildDepGraphInvocation).toThrowError();
      });
      it(`should throw an error if lockFileContents value is ${testCase.description}`, () => {
        const manifestFileContents = `[tool.poetry.dependencies]
          pkg-a = "^2.11"`;
        const buildDepGraphInvocation = () => {
          buildDepGraph(manifestFileContents, testCase.value);
        };
        expect(buildDepGraphInvocation).toThrowError();
      });
    });
  });

  it('should throw an error if its unable to find a dependency listed in pyproject.toml in poetry.lock', () => {
    const missingPackage = 'pkg-a';
    const manifestFileContents = `[tool.poetry.dependencies]
      ${missingPackage} = "^2.11"`;
    const lockFileContents = `[[package]]
      category = "main"
      name = "pkg-b"
      optional = false
      version = "1.1.1"`;
    const buildDepGraphInvocation = () => {
      buildDepGraph(manifestFileContents, lockFileContents);
    };
    expect(buildDepGraphInvocation).toThrowError(
      `Unable to find dependencies in poetry.lock for package: ${missingPackage}`,
    );
  });

  it('should resolve any dependencies defined with an underscore to hyphen', () => {
    const originalPackageName = 'pkg_b';
    const expectedPackageName = 'pkg-b';
    const manifestFileContents = `[tool.poetry.dependencies]
      ${originalPackageName} = "^2.11"`;
    const lockFileContents = `[[package]]
      category = "main"
      name = "pkg-a"
      optional = false
      version = "1.1.1"      
      [package.dependencies]
      ${originalPackageName} = ">=3.7.4"      
      [[package]]
      category = "main"
      name = "${expectedPackageName}"
      optional = false
      version = "3.7.4"`;
    const result = buildDepGraph(manifestFileContents, lockFileContents);
    const pkgWithHyphen = result.getDepPkgs().find((dependency) => {
      return dependency.name === expectedPackageName;
    });
    expect(pkgWithHyphen).toBeDefined();
  });
});
