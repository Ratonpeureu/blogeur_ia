import re
import uuid
import unicodedata


def gen_id() -> str:
    return uuid.uuid4().hex


def slugify(texte: str, max_len: int = 90) -> str:
    text = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text)[:max_len]