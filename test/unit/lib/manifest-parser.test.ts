import {
  getDependencyNamesFrom,
  ManifestFileNotValid,
  pkgInfoFrom,
} from '../../../lib/manifest-parser';

describe('when loading manifest files', () => {
  describe('pkgInfoFrom', () => {
    it('should return package info given the contents of a manifest', () => {
      const fileContents = `[tool.poetry]
        name = "poetry-fixtures-project"
        version = "0.1.0"`;

      const { name, version } = pkgInfoFrom(fileContents);
      expect(name).toBe('poetry-fixtures-project');
      expect(version).toBe('0.1.0');
    });

    it('should throw ManifestFileNotValid if it cannot retrieve package information', () => {
      const fileContents = `[build-system]
        requires = ["poetry>=0.12"]
        build-backend = "poetry.masonry.api"`;
      const errorResult = () => {
        pkgInfoFrom(fileContents);
      };
      expect(errorResult).toThrow(ManifestFileNotValid);
    });
  });

  describe('getDependencyNamesFrom', () => {
    it('should throw exception if tools.poetry stanza not found', () => {
      expect(() => getDependencyNamesFrom('', false)).toThrow(
        ManifestFileNotValid,
      );
    });

    it('should return list of dependency package names', () => {
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

    it('should not return any dependencies when dependency stanza not present', () => {
      const poetryDependencies = getDependencyNamesFrom('[tool.poetry]', false);
      expect(poetryDependencies.length).toBe(0);
    });

    it('should handle quoted keys in inline tables', () => {
      const fileContents = `[tool.poetry.dependencies]
      pkg_a = {"version" = "^1.0"}`;
      const poetryDependencies = getDependencyNamesFrom(fileContents, false);
      expect(poetryDependencies.length).toBe(1);
      expect(poetryDependencies.includes('pkg_a')).toBe(true);
    });
  });
});
