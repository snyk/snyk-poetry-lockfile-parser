import { getDependencyNamesFrom } from '../../../lib';

describe('loading manifest files', () => {
  it('should parse file and return list of poetry dependency names', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      pkg_b = "^1.0"`;
    const poetryDependencies = getDependencyNamesFrom(fileContents);
    expect(poetryDependencies.length).toBe(2);
    expect(poetryDependencies.includes("pkg_a")).toBe(true);
    expect(poetryDependencies.includes("pkg_b")).toBe(true);
  });

  it('should not return python if listed as a dependency', () => {
    const fileContents = `[tool.poetry.dependencies]
      pkg_a = "^2.11"
      python = "~2.7 || ^3.5"`
    const poetryDependencies = getDependencyNamesFrom(fileContents);
    expect(poetryDependencies.length).toBe(1);
    expect(poetryDependencies.includes("pkg_a")).toBe(true);
    expect(poetryDependencies.includes("python")).toBe(false);
  });

  it('should not return any dependencies for an empty file', () => {
    const poetryDependencies = getDependencyNamesFrom('');
    expect(poetryDependencies.length).toBe(0);
  });
})