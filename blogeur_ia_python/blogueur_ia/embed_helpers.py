import re
import httpx

YOUTUBE_PATTERNS = [
    r"youtube\.com/watch\?v=([\w-]{11})",
    r"youtu\.be/([\w-]{11})",
    r"youtube\.com/embed/([\w-]{11})",
]
VIMEO_PATTERN = r"vimeo\.com/(\d+)"


def extraire_embed_video(url: str) -> dict | None:
    for pattern in YOUTUBE_PATTERNS:
        m = re.search(pattern, url)
        if m:
            return {"provider": "youtube", "embed_url": f"https://www.youtube.com/embed/{m.group(1)}"}
    m = re.search(VIMEO_PATTERN, url)
    if m:
        return {"provider": "vimeo", "embed_url": f"https://player.vimeo.com/video/{m.group(1)}"}
    return None


async def url_est_valide(url: str) -> bool:
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as http:
            resp = await http.head(url)
            if resp.status_code >= 400:
                resp = await http.get(url)
            return resp.status_code < 400
    except Exception:
        return False


def embed_maps(lat: float, lng: float, zoom: int = 15) -> str:
    return f"https://www.google.com/maps?q={lat},{lng}&z={zoom}&output=embed&hl=fr"