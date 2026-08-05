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
      expect(labels['hash:sha-256']).toBe('aabbcc');
    });

    it('ignores an unrecognised / malformed hash', () => {
      const labels = getComponentMetadataLabels({
        name: 'x',
        files: [{ file: 'x-1.0.0.tar.gz', hash: 'notahash' }],
      });
      expect(labels['hash:sha-256']).toBeUndefined();
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

    it('builds the PEP 503 project-page URL for a `legacy` private index, pointing at the selected file', () => {
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
        'https://artifactory.internal.example/api/pypi/pypi-remote/simple/internal-lib/#internal_lib-2.3.0.tar.gz',
      );
    });

    it('points the fragment at the ladder-selected file so URL and hash agree', () => {
      const labels = getComponentMetadataLabels({
        name: 'six',
        files: [
          { file: 'six-1.17.0-py2.py3-none-any.whl', hash: 'sha256:wheel' },
          { file: 'six-1.17.0.tar.gz', hash: 'sha256:sdist' },
        ],
        source: { type: 'legacy', url: 'https://index.example/simple' },
      });
      expect(labels['hash:sha-256']).toBe('wheel');
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/six/#six-1.17.0-py2.py3-none-any.whl',
      );
    });

    it('emits the bare project-page URL when no artifact could be selected', () => {
      const labels = getComponentMetadataLabels({
        name: 'nvidia-cublas-cu12',
        files: [
          {
            file: 'nvidia_cublas_cu12-1-py3-none-manylinux2014_x86_64.whl',
            hash: 'sha256:p1',
          },
          {
            file: 'nvidia_cublas_cu12-1-py3-none-win_amd64.whl',
            hash: 'sha256:p2',
          },
        ],
        source: { type: 'legacy', url: 'https://index.example/simple' },
      });
      expect(labels['hash:sha-256']).toBeUndefined();
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/nvidia-cublas-cu12/',
      );
    });

    it('normalises a trailing slash on the legacy index root', () => {
      const labels = getComponentMetadataLabels({
        name: 'foo',
        files: [{ file: 'foo-1.0.0.tar.gz', hash: 'sha256:a' }],
        source: { type: 'legacy', url: 'https://index.example/simple/' },
      });
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/foo/#foo-1.0.0.tar.gz',
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
        'https://index.example/simple/foo/#foo-1.0.0.tar.gz',
      );
    });

    it('strips a query-string token from a legacy index URL', () => {
      // Some private indexes carry authentication material in the query string
      // rather than as basic-auth userinfo. It is not part of the artifact's
      // identity, so it must not appear in the label — and it must not corrupt
      // the appended project path.
      const labels = getComponentMetadataLabels({
        name: 'foo',
        files: [{ file: 'foo-1.0.0.tar.gz', hash: 'sha256:a' }],
        source: {
          type: 'legacy',
          url: 'https://index.example/simple?token=s3cr3t',
        },
      });
      expect(labels['distribution:url']).toBe(
        'https://index.example/simple/foo/#foo-1.0.0.tar.gz',
      );
    });

    it('strips a signed-URL query from a direct `url` source', () => {
      // A direct-URL dependency can point at a signed artifact URL whose query
      // string is authentication material rather than identity. distribution:url
      // is provenance, not a fetch target, so the query is dropped.
      const labels = getComponentMetadataLabels({
        name: 'example-pkg',
        files: [
          { file: 'example_pkg-1.0.0-py3-none-any.whl', hash: 'sha256:a' },
        ],
        source: {
          type: 'url',
          url:
            'https://bucket.s3.example/example_pkg-1.0.0-py3-none-any.whl' +
            '?X-Amz-Signature=deadbeef&X-Amz-Credential=AKIA',
        },
      });
      expect(labels['distribution:url']).toBe(
        'https://bucket.s3.example/example_pkg-1.0.0-py3-none-any.whl',
      );
    });

    it('strips userinfo and query together', () => {
      const labels = getComponentMetadataLabels({
        name: 'foo',
        files: [{ file: 'foo-1.0.0.tar.gz', hash: 'sha256:a' }],
        source: {
          type: 'legacy',
          url: 'https://user:pass@index.example/simple?token=s3cr3t',
        },
      });
      const url = labels['distribution:url'];
      expect(url).toBe('https://index.example/simple/foo/#foo-1.0.0.tar.gz');
      expect(url).not.toContain('s3cr3t');
      expect(url).not.toContain('user:pass');
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

    it('builds the pypi.org project-page URL for the default PyPI case (no source stanza)', () => {
      // No `[package.source]` reliably means the built-in PyPI (poetry records a stanza for
      // every other index, including a custom primary source), so we can assume pypi.org.
      const labels = getComponentMetadataLabels({
        name: 'Requests',
        files: [{ file: 'requests-2.0.0.tar.gz', hash: 'sha256:a' }],
      });
      expect(labels['hash:sha-256']).toBe('a');
      expect(labels['distribution:url']).toBe(
        'https://pypi.org/simple/requests/#requests-2.0.0.tar.gz',
      );
    });

    it('emits a bare pypi.org page when no artifact is selected for a PyPI package', () => {
      const labels = getComponentMetadataLabels({
        name: 'onlyplatwheels',
        files: [
          {
            file: 'onlyplatwheels-1-cp311-cp311-manylinux1_x86_64.whl',
            hash: 'sha256:a',
          },
          {
            file: 'onlyplatwheels-1-cp311-cp311-win_amd64.whl',
            hash: 'sha256:b',
          },
        ],
      });
      expect(labels['hash:sha-256']).toBeUndefined();
      expect(labels['distribution:url']).toBe(
        'https://pypi.org/simple/onlyplatwheels/',
      );
    });
  });
});
