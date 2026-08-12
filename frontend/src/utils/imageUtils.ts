export function getImageUrl(url?: string): string {
  if (!url) {
    return 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80';
  }

  // If already absolute URL (e.g. Unsplash or S3 full URL)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // If relative path from local storage (/uploads/properties/...)
  if (url.startsWith('/')) {
    return url; // Vite proxy handles /uploads automatically to http://localhost:5000
  }

  return `/${url}`;
}
