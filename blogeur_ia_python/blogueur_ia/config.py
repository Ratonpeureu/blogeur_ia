import os
import configparser
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


def _split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def _parse_ids_labels(value: str) -> list[dict]:
    resultat = []
    for paire in _split_csv(value):
        if ":" in paire:
            id_, label = paire.split(":", 1)
            resultat.append({"id": id_.strip(), "label": label.strip()})
    return resultat


@dataclass
class Settings:
    # secrets / connexions (depuis .env)
    database_url: str
    serper_api_key: str
    llm_api_key: str

    # marque
    brand_name: str
    base_url: str
    author_default: str
    persona_name: str
    persona_bio: str

    # style éditorial
    secteur: str
    min_words: int
    max_words: int
    temperature_redaction: float
    temperature_reecriture: float
    interdits: list[str]

    # garde-fou anti-promo
    promo_guard_enabled: bool
    brand_trigger_keywords: list[str]
    mentions_interdites: list[str]

    # catégories
    categories: list[dict]
    categorie_produit_id: str
    categorie_defaut: str

    # mots-clés SEO
    mots_cles_pool: list[str]

    # fiche technique produit (anti-hallucination)
    fiche_technique_path: str

    # stockage médias
    storage_dir: str
    storage_base_url: str
    storage_max_size_mb: int

    # serper
    serper_gl: str
    serper_hl: str

    # LLM
    llm_provider: str
    llm_model: str


def load_settings() -> Settings:
    conf_path = os.getenv("BLOGUEUR_IA_CONF", "blogueur_ia.conf")
    parser = configparser.ConfigParser()
    if os.path.exists(conf_path):
        parser.read(conf_path, encoding="utf-8")
    else:
        raise FileNotFoundError(
            f"Fichier de configuration introuvable : {conf_path}. "
            f"Copiez blogueur_ia.conf.example vers blogueur_ia.conf et adaptez-le."
        )

    g = lambda section, key, default="": parser.get(section, key, fallback=default)

    return Settings(
        database_url=os.getenv("DATABASE_URL", ""),
        serper_api_key=os.getenv("SERPER_API_KEY", ""),
        llm_api_key=os.getenv("LLM_API_KEY", ""),

        brand_name=g("brand", "name", "Mon Entreprise"),
        base_url=g("brand", "base_url", "https://exemple.com").rstrip("/"),
        author_default=g("brand", "author_default", "Équipe Éditoriale"),
        persona_name=g("brand", "persona_name", "Auteur"),
        persona_bio=g("brand", "persona_bio", "professionnel du secteur"),

        secteur=g("style", "secteur", "votre secteur d'activité"),
        min_words=int(g("style", "min_words", "900")),
        max_words=int(g("style", "max_words", "1600")),
        temperature_redaction=float(g("style", "temperature_redaction", "0.9")),
        temperature_reecriture=float(g("style", "temperature_reecriture", "0.7")),
        interdits=_split_csv(g("style", "interdits", "")),

        promo_guard_enabled=g("promo_guard", "enabled", "true").lower() == "true",
        brand_trigger_keywords=_split_csv(g("promo_guard", "brand_trigger_keywords", "")),
        mentions_interdites=_split_csv(g("promo_guard", "mentions_interdites", "")),

        categories=_parse_ids_labels(g("categories", "ids_labels", "guide:Guide")),
        categorie_produit_id=g("categories", "categorie_produit_id", "produit"),
        categorie_defaut=g("categories", "categorie_defaut", "guide"),

        mots_cles_pool=_split_csv(g("mots_cles_seo", "pool", "")),

        fiche_technique_path=g("fiche_technique", "path", ""),

        storage_dir=g("storage", "dir", "./uploads/blog"),
        storage_base_url=g("storage", "base_url", "https://exemple.com/uploads/blog").rstrip("/"),
        storage_max_size_mb=int(g("storage", "max_size_mb", "6")),

        serper_gl=g("serper", "gl", "sn"),
        serper_hl=g("serper", "hl", "fr"),

        llm_provider=g("llm", "provider", "anthropic"),
        llm_model=g("llm", "model", "claude-sonnet-4-5"),
    )


settings = load_settings()