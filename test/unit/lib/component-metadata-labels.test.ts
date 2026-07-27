import { getComponentMetadataLabels } from '../../../lib/component-metadata-labels';

describe('getComponentMetadataLabels', () => {
  describe('hash selection ladder', () => {
    it('uses the single published file directly (unambiguous)', () => {
      const labels = getComponentMetadataLabels({
        name: 'only-sdist',
        files: [{ file: 'only-sdist-1.0.0.tar.gz', hash: 'sha256:aaaa' }],
      });
      expect(labels['hash:sha-256']).toBe('aaaa');
    });

    it('prefers the platform-independent wheel over the sdist', () => {
      const labels = getComponentMetadataLabels({
        name: 'six',
        files: [
          { file: 'six-1.17.0-py2.py3-none-any.whl', hash: 'sha256:wheel' },
          { file: 'six-1.17.0.tar.gz', hash: 'sha256:sdist' },
        ],
      });
      expect(labels['hash:sha-256']).toBe('wheel');
    });

    it('falls back to the sdist when there is no universal wheel', () => {
      const labels = getComponentMetadataLabels({
        name: 'markupsafe',
        files: [
          {
            file: 'MarkupSafe-1.1.1-cp38-cp38-manylinux1_x86_64.whl',
            hash: 'sha256:plat1',
          },
          {
            file: 'MarkupSafe-1.1.1-cp38-cp38-win_amd64.whl',
            hash: 'sha256:plat2',
          },
          { file: 'MarkupSafe-1.1.1.tar.gz', hash: 'sha256:sdist' },
        ],
      });
      expect(labels['hash:sha-256']).toBe('sdist');
    });

    it('emits no hash when only platform-specific wheels exist', () => {
      const labels = getComponentMetadataLabels({
        name: 'nvidia-cublas-cu12',
        files: [
          {
            file: 'nvidia_cublas_cu12-12.4.5.8-py3-none-manylinux2014_x86_64.whl',
            hash: 'sha256:plat1',
          },
          {
            file: 'nvidia_cublas_cu12-12.4.5.8-py3-none-win_amd64.whl',
            hash: 'sha256:plat2',
          },
        ],
      });
      expect(labels['hash:sha-256']).toBeUndefined();
    });

    it('emits no hash when there are no files', () => {
      expect(getComponentMetadataLabels({ name: 'nofiles' })).toEqual({});
      expect(
        getComponentMetadataLabels({ name: 'nofiles', files: [] }),
      ).toEqual({});
    });
  });

  describe('hash formatting', () => {
    it('maps sha256 to hash:sha-256 with a lowercase-hex value', () => {
      const labels = getComponentMetadataLabels({
        name: 'x',
        files: [{ file: 'x-1.0.0.tar.gz', hash: 'sha256:AABBCC' }],
      });
      expect(labels).toEqual({ 'hash:sha-256': 'aabbcc' });
    });

    it('ignores an unrecognised / malformed hash', () => {
      expect(
        getComponentMetadataLabels({
          name: 'x',
          files: [{ file: 'x-1.0.0.tar.gz', hash: 'notahash' }],
        }),
      ).toEqual({});
    });
  });

  describe('distribution:url', () => {
    it('emits the exact artifact URL for a direct `url` source', () => {
      const labels = getComponentMetadataLabels({
        name: 'example-pkg',
        files: [
          { file: 'example_pkg-1.0.0-py3-none-any.whl', hash: 'sha256:a' },
        ],
        source: {
          type: 'url',
          url: 'https://example.com/artifacts/example_pkg-1.0.0-py3-none-any.whl',
        },
      });
      expect(labels['distribution:url']).toBe(
        'https://example.com/artifacts/example_pkg-1.0.0-py3-none-any.whl',
      );
    });

    it('builds the PEP 503 project-page URL for a `legacy` private index', () => {
      const labels = getComponentMetadataLabels({
        name: 'Internal_Lib',
        files: [{ file: 'internal_lib-2.3.0.tar.gz', hash: 'sha256:a' }],
        source: {
          type: 'legacy',
          url: 'https://artifactory.internal.example/api/pypi/pypi-remote/simple',
          reference: 'internal',
        },
      });
      expect(labels['distribution:url']).toBe(
        'https://artifactory.internal.example/api/pypi/pypi-remote/simple/internal-lib/',
      );
    });

    it('normalises a trailing slash on the legacy index root', () => {
      const labels = getComponentMetadataLabels({
        name: 'foo',
        files: [{ file: 'foo-1.0.0.tar.gz', hash: 'sha256:a' }],
        source: { type: 'legacy', url: 'https://index.example/simple/' },
      });
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/foo/',
      );
    });

    it('strips basic-auth credentials from the emitted URL', () => {
      const labels = getComponentMetadataLabels({
        name: 'foo',
        files: [{ file: 'foo-1.0.0.tar.gz', hash: 'sha256:a' }],
        source: {
          type: 'legacy',
          url: 'https://user:token@index.example/simple',
        },
      });
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/foo/',
      );
    });

    it('emits no URL for a git source', () => {
      const labels = getComponentMetadataLabels({
        name: 'forked-tool',
        files: [],
        source: {
          type: 'git',
          url: 'https://github.com/example-org/forked-tool.git',
          reference: 'HEAD',
        },
      });
      expect(labels['distribution:url']).toBeUndefined();
    });

    it('emits no URL for the common PyPI case (no source stanza)', () => {
      const labels = getComponentMetadataLabels({
        name: 'requests',
        files: [{ file: 'requests-2.0.0.tar.gz', hash: 'sha256:a' }],
      });
      expect(labels['distribution:url']).toBeUndefined();
      expect(labels['hash:sha-256']).toBe('a');
    });
  });
});
