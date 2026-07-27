import * as debugLib from 'debug';

const debug = debugLib('snyk-poetry-lockfile-parser');

// Component-metadata labels follow the convention established in nodejs-lockfile-parser:
// `hash:<alg>` keys with hyphenated algorithm names and lowercase-hex values, and a
// credential-stripped `distribution:url`. These feed sbom-export's Component.Hashes[] and
// the "distribution" ExternalUrls entry.
//
// See docs/component-metadata.md for the full rationale: why we emit one artifact per node
// (the label channel is single-valued and the lockfile is a platform-agnostic *set*), why
// the common PyPI case has no URL, and how the `legacy` private-index URL is constructed.

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

function distributionUrlLabel(
  name: string,
  source: LockFileEntrySource | undefined,
  selected: LockFileEntryFile | undefined,
): Record<string, string> {
  if (!source || !source.url) {
    return {};
  }
  // Direct-URL dependency: the source URL is the exact artifact.
  if (source.type === 'url') {
    const cleaned = sanitizeUrl(source.url);
    return cleaned ? { 'distribution:url': cleaned } : {};
  }
  // Private index (PEP 503 Simple API repository). poetry recorded the real index root, so
  // we build the package's project page and point it at the selected file:
  // <root>/<pep503-normalized-name>/#<selected-filename>. The `#<filename>` is an identifier
  // fragment (which file the sibling hash label describes), NOT a navigable anchor or a
  // download URL — the page's real anchors link to the artifacts, which we cannot
  // reconstruct offline. When no artifact was selected we emit the bare package-granular
  // project page.
  if (source.type === 'legacy') {
    const projectPage = buildSimpleIndexProjectUrl(source.url, name, selected);
    return projectPage ? { 'distribution:url': projectPage } : {};
  }
  // git / file / directory: not a downloadable distribution artifact.
  return {};
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

// Strip embedded basic-auth credentials and any URL fragment before emitting.
function sanitizeUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    url.username = '';
    url.password = '';
    url.hash = '';
    return url.toString();
  } catch {
    return undefined;
  }
}
