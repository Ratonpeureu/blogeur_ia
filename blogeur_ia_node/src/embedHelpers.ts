import axios from "axios";

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch\?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
];
const VIMEO_PATTERN = /vimeo\.com\/(\d+)/;

export interface EmbedVideo {
  provider: "youtube" | "vimeo";
  embedUrl: string;
}

export function extraireEmbedVideo(url: string): EmbedVideo | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern);
    if (m) return { provider: "youtube", embedUrl: `https://www.youtube.com/embed/${m[1]}` };
  }
  const m = url.match(VIMEO_PATTERN);
  if (m) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${m[1]}` };
  return null;
}

export async function urlEstValide(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    let resp = await axios.head(url, { timeout: 8000, maxRedirects: 5, validateStatus: () => true });
    if (resp.status >= 400) {
      resp = await axios.get(url, { timeout: 8000, maxRedirects: 5, validateStatus: () => true });
    }
    return resp.status < 400;
  } catch {
    return false;
  }
}

export function embedMaps(lat: number, lng: number, zoom = 15): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed&hl=fr`;
}