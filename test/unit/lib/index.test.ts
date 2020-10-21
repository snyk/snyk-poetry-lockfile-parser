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
