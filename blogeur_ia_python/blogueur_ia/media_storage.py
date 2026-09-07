import os
import hashlib
import mimetypes
import httpx
from datetime import datetime

from blogueur_ia.config import settings

EXTENSIONS_AUTORISEES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


async def telecharger_et_heberger_image(url: str) -> str | None:
    if not url:
        return None
    taille_max = settings.storage_max_size_mb * 1024 * 1024
    try:
        async with httpx.AsyncClient(timeout=12, follow_redirects=True) as http:
            resp = await http.get(url, headers={"User-Agent": "Mozilla/5.0 (BlogueurIA/1.0)"})
            if resp.status_code != 200:
                return None
            content_type = resp.headers.get("content-type", "").split(";")[0].strip()
            ext = EXTENSIONS_AUTORISEES.get(content_type)
            if not ext:
                guessed = mimetypes.guess_type(url)[0]
                ext = EXTENSIONS_AUTORISEES.get(guessed)
                if not ext:
                    return None
            content = resp.content
            if len(content) > taille_max or len(content) < 500:
                return None

            digest = hashlib.sha256(content).hexdigest()[:24]
            sous_dossier = datetime.utcnow().strftime("%Y/%m")
            dossier_complet = os.path.join(settings.storage_dir, sous_dossier)
            os.makedirs(dossier_complet, exist_ok=True)

            nom_fichier = f"{digest}{ext}"
            chemin_local = os.path.join(dossier_complet, nom_fichier)
            if not os.path.exists(chemin_local):
                with open(chemin_local, "wb") as f:
                    f.write(content)

            return f"{settings.storage_base_url}/{sous_dossier}/{nom_fichier}"
    except Exception:
        return None