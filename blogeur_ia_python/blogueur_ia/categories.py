from blogueur_ia.config import settings

CATEGORIES_BLOG = settings.categories
CATEGORIES_BLOG_IDS = {c["id"] for c in CATEGORIES_BLOG}
CATEGORIE_PRODUIT_ID = settings.categorie_produit_id
CATEGORIE_DEFAUT = settings.categorie_defaut