/** Client-safe URL for a stored file (served via the ownership-checked route). */
export function fileUrl(key: string): string {
  return `/api/files/${key}`;
}
