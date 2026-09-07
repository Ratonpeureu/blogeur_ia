from blogueur_ia.blog_service import creer_article
from blogueur_ia.config import settings


async def creer_brouillon_depuis_sortie(titre_feature: str, description_feature: str, categorie: str | None = None) -> None:
    """À appeler après un déploiement de fonctionnalité notable — reste un BROUILLON,
    jamais publié automatiquement, pour garder un contrôle éditorial humain."""
    categorie = categorie or settings.categorie_produit_id
    contenu_html = f"""
    <p>{description_feature}</p>
    <p>Cette fonctionnalité est désormais disponible sur {settings.brand_name}.</p>
    """
    await creer_article(
        titre=f"Nouveauté : {titre_feature}",
        chapo=description_feature[:160],
        contenu_html=contenu_html,
        categorie=categorie,
        tags=["nouveaute", "produit"],
        auteur=settings.author_default,
        created_by="system_auto",
        source="auto_release",
        publier_immediatement=False,
    )