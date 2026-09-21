/**
 * Client-safe URL for a stored file (served via the ownership-checked route).
 * Pass `version` (e.g. the row's updatedAt ms) so regenerated images bust the
 * browser cache — the key stays the same but the URL changes.
 */
export function fileUrl(key: string, version?: number | string | Date): string {
  const base = `/api/files/${key}`;
  if (version == null) return base;
  const v = version instanceof Date ? version.getTime() : version;
  return `${base}?v=${v}`;
}
