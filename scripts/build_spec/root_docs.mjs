import { buildRootDocs as polydocBuildRootDocs } from '@ktav-lang/polydoc';

export {
  ROOT_DOCUMENTS,
  rootDocUnitsDir,
  rootOutputName,
  writeRootDocs,
  checkRootDocs,
} from '@ktav-lang/polydoc';

/// `versions/` is what identifies this repository's root, and it is the
/// same marker the Rust conformance runner uses to find a spec checkout.
/// A bare test tree that builds only `content/` has no `versions/` and
/// correctly generates nothing.
export function buildRootDocs(repoRoot, options = {}) {
  return polydocBuildRootDocs(repoRoot, { rootMarker: 'versions', ...options });
}
