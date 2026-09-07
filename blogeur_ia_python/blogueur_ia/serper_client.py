import httpx
from blogueur_ia.config import settings

SERPER_BASE = "https://google.serper.dev"


def _headers():
    return {"X-API-KEY": settings.serper_api_key, "Content-Type": "application/json"}


async def _post(endpoint: str, payload: dict) -> dict:
    if not settings.serper_api_key:
        return {}
    async with httpx.AsyncClient(timeout=12) as http:
        try:
            resp = await http.post(f"{SERPER_BASE}/{endpoint}", headers=_headers(), json=payload)
            if resp.status_code != 200:
                return {}
            return resp.json()
        except Exception:
            return {}


async def serper_search(q: str, num: int = 8) -> list[dict]:
    data = await _post("search", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl})
    return data.get("organic", [])


async def serper_search_time_define(q: str, num: int = 8, tbs: str = "qdr:w") -> list[dict]:
    data = await _post("search", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl, "tbs": tbs})
    return data.get("organic", [])


async def serper_news(q: str, num: int = 6) -> list[dict]:
    data = await _post("news", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl})
    return data.get("news", [])


async def serper_images(q: str, num: int = 6) -> list[dict]:
    data = await _post("images", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl})
    return data.get("images", [])


async def serper_videos(q: str, num: int = 5) -> list[dict]:
    data = await _post("videos", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl})
    return data.get("videos", [])


async def serper_places(q: str, num: int = 5) -> list[dict]:
    data = await _post("places", {"q": q, "num": num, "gl": settings.serper_gl, "hl": settings.serper_hl})
    return data.get("places", [])