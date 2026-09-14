/**
 * Convert a Google Drive sharing URL or file ID to a direct image URL
 * @param url - Google Drive sharing URL or direct image URL
 * @returns Direct image URL or empty string if invalid
 * 
 * Supported formats:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/uc?export=view&id=FILE_ID
 * - https://drive.google.com/open?id=FILE_ID
 * - FILE_ID (raw file ID)
 * - Regular image URLs (https://...)
 */
export function getGoogleDriveImageUrl(url: string | undefined): string {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  // If it's a regular image URL, return as-is
  if (trimmed.startsWith('http') && !trimmed.includes('drive.google.com')) return trimmed;

  // Keep Drive requests same-origin so the browser does not need Drive CORS headers.
  if (trimmed.includes('drive.google.com/uc?')) {
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }
  
  // Extract Google Drive file ID from various URL formats
  const fileIdMatch = trimmed.match(/(?:file\/d\/|id=|google\.com\/[^/]*\?id=)([a-zA-Z0-9_-]+)/);
  
  if (fileIdMatch && fileIdMatch[1]) {
    const fileId = fileIdMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
  }
  
  // If it looks like a file ID (alphanumeric with dashes/underscores), treat it as such
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed.length > 10) {
    const directUrl = `https://drive.google.com/uc?export=download&id=${trimmed}`;
    return `/api/image-proxy?url=${encodeURIComponent(directUrl)}`;
  }
  
  // Return as-is if it's a regular URL or invalid
  return trimmed;
}

// Legacy alias for backward compatibility
export function driveImageUrl(value: string | undefined): string {
  return getGoogleDriveImageUrl(value);
}
