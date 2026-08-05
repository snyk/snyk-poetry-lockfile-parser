import * as debugLib from 'debug';

const debug = debugLib('snyk-poetry-lockfile-parser');

// Component-metadata labels use the shape sbom-export consumes: `hash:<alg>` keys with
// hyphenated algorithm names and lowercase-hex values (feeding Component.Hashes[]), and a
// credential-stripped `distribution:url` (feeding the "distribution" ExternalUrls entry).
//
// Two properties of poetry.lock drive the design here, and are why this isn't a straight
// copy of the label mapping other ecosystems use:
//
//  1. A package's `files` is a platform-agnostic *set* — the sdist plus every published
//     wheel. A label holds a single value (and a CycloneDX Component.Hashes[] means "one
//     artifact, several algorithms", not "several artifacts"), so we must collapse to one
//     artifact. selectArtifact() does that deterministically, without needing to know a
//     target platform.
//  2. The lock never records an artifact *download* URL, and we must not fetch one (the
//     same code path serves private indexes whose credentials we don't hold). What poetry
//     does record is the index a package came from, so distribution:url is a PEP 503
//     project-page URL pointed at the selected file — see distributionUrlLabel().

export interface LockFileEntryFile {
  file: string;
  hash: string; // e.g. "sha256:<hex>"
}

export interface LockFileEntrySource {
  type: string; // "url" | "legacy" | "git" | "file" | "directory"
  url?: string;
  reference?: string;
}

export interface ComponentMetadataInput {
  name: string;
  files?: LockFileEntryFile[];
  source?: LockFileEntrySource;
}

// poetry locks only ever carry sha256, but map defensively so an unexpected algorithm is
// skipped rather than mislabelled.
const HASH_ALG_TO_LABEL: Record<string, string> = {
  sha256: 'hash:sha-256',
  sha512: 'hash:sha-512',
  sha384: 'hash:sha-384',
  sha1: 'hash:sha-1',
  md5: 'hash:md5',
};

export function getComponentMetadataLabels(
  pkg: ComponentMetadataInput,
): Record<string, string> {
  // No files recorded means no artifact to hash and no distribution to point at (real PyPI /
  // index packages always list files; fileless entries are anomalous), so report nothing.
  if (!pkg.files || pkg.files.length === 0) {
    return {};
  }
  // Select the artifact once so the hash and the distribution URL describe the *same* file.
  const selected = selectArtifact(pkg.name, pkg.files);
  return {
    ...hashLabel(selected),
    ...distributionUrlLabel(pkg.name, pkg.source, selected),
  };
}

function hashLabel(
  selected: LockFileEntryFile | undefined,
): Record<string, string> {
  if (!selected) {
    return {};
  }
  return hashToLabel(selected.hash);
}

// Collapse the lockfile's candidate `files` set to a single artifact. The label channel
// holds one hash per node and the lockfile lists every published distribution (sdist + all
// wheels) platform-agnostically, so we choose deterministically.
function selectArtifact(
  name: string,
  files?: LockFileEntryFile[],
): LockFileEntryFile | undefined {
  if (!files || files.length === 0) {
    return undefined;
  }
  // A single published file (or a `url`/`file` source pinned to one artifact) is
  // unambiguous — use it regardless of platform-specificity.
  if (files.length === 1) {
    return files[0];
  }
  // 1. platform-independent wheel (`*-none-any.whl`) — what pip installs everywhere for a
  //    pure-python package, and deterministic across parsing hosts.
  const universalWheel = files.find((f) => isUniversalWheel(f.file));
  if (universalWheel) {
    return universalWheel;
  }
  // 2. sdist (`.tar.gz` / `.zip`) — canonical, platform-independent release identity.
  const sdist = files.find((f) => isSdist(f.file));
  if (sdist) {
    return sdist;
  }
  // 3. only platform-specific wheels, no universal wheel, no sdist: we cannot know the
  //    target platform offline, so emit no hash rather than guess.
  debug(
    `No platform-independent artifact for "${name}"; emitting no hash (only platform-specific wheels found).`,
  );
  return undefined;
}

function isUniversalWheel(filename: string): boolean {
  return /-none-any\.whl$/i.test(filename);
}

function isSdist(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.tar.gz') || lower.endsWith('.zip');
}

function hashToLabel(hash: string): Record<string, string> {
  const separatorIndex = hash.indexOf(':');
  if (separatorIndex === -1) {
    return {};
  }
  const alg = hash.slice(0, separatorIndex).toLowerCase();
  const value = hash.slice(separatorIndex + 1);
  const label = HASH_ALG_TO_LABEL[alg];
  if (!label || !value) {
    return {};
  }
  return { [label]: value.toLowerCase() };
}

// poetry records a `[package.source]` stanza for every index except the built-in PyPI
// (including a custom primary/default source, which is recorded as `legacy`). So the absence
// of a source stanza reliably means the package came from pypi.org, and we can build its
// PEP 503 project page from this well-known root.
const PYPI_SIMPLE_ROOT = 'https://pypi.org/simple';

function distributionUrlLabel(
  name: string,
  source: LockFileEntrySource | undefined,
  selected: LockFileEntryFile | undefined,
): Record<string, string> {
  // No source stanza => built-in PyPI. Build its project page (see PYPI_SIMPLE_ROOT note).
  if (!source) {
    return projectPageLabel(PYPI_SIMPLE_ROOT, name, selected);
  }
  // Direct-URL dependency: the source URL is the exact artifact.
  if (source.type === 'url' && source.url) {
    const cleaned = sanitizeUrl(source.url);
    return cleaned ? { 'distribution:url': cleaned } : {};
  }
  // Private index (PEP 503 Simple API repository): poetry recorded the real index root.
  if (source.type === 'legacy' && source.url) {
    return projectPageLabel(source.url, name, selected);
  }
  // git / file / directory: not a downloadable distribution artifact.
  return {};
}

// Build the PEP 503 project-page URL for `name` under `root`, pointed at the selected file:
// <root>/<pep503-normalized-name>/#<selected-filename>. The `#<filename>` is an identifier
// fragment (which file the sibling hash label describes), NOT a navigable anchor or a
// download URL — the page's real anchors link to the artifacts, which we cannot reconstruct
// offline. When no artifact was selected we emit the bare package-granular project page.
function projectPageLabel(
  root: string,
  name: string,
  selected: LockFileEntryFile | undefined,
): Record<string, string> {
  const projectPage = buildSimpleIndexProjectUrl(root, name, selected);
  return projectPage ? { 'distribution:url': projectPage } : {};
}

function buildSimpleIndexProjectUrl(
  root: string,
  name: string,
  selected: LockFileEntryFile | undefined,
): string | undefined {
  const cleaned = sanitizeUrl(root);
  if (!cleaned) {
    return undefined;
  }
  const base = cleaned.replace(/\/+$/, '');
  const projectPage = `${base}/${normalizePep503Name(name)}/`;
  return selected ? `${projectPage}#${selected.file}` : projectPage;
}

// PEP 503: normalize by lowercasing and collapsing runs of -, _, . to a single -.
function normalizePep503Name(name: string): string {
  return name.toLowerCase().replace(/[-_.]+/g, '-');
}

// Reduce a source URL to its canonical identity before it becomes a
// distribution:url provenance label: clear basic-auth userinfo, the query
// string, and the fragment. distribution:url is not a fetch target — a PEP 503
// project page is `<root>/<pkg>/#<file>` and needs no query, and a direct-url
// artifact's query is not part of its identity — so the query never belongs in
// the label. Query strings can also carry authentication material, so dropping
// them keeps that out of the label. The fragment is re-added by the caller from
// the selected artifact, so a source-provided one is noise.
function sanitizeUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}
