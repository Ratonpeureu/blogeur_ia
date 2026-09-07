from datetime import datetime
from sqlmodel import select
from fastapi import HTTPException

from blogueur_ia.db import get_session
from blogueur_ia.models import BlogArticle
from blogueur_ia.utils import slugify


async def generate_unique_article_slug(titre: str) -> str:
    base = slugify(titre, max_len=80)
    candidate = base
    counter = 2
    async with get_session() as session:
        while True:
            exists = (await session.execute(
                select(BlogArticle).where(BlogArticle.slug == candidate)
            )).scalar_one_or_none()
            if not exists:
                return candidate
            candidate = f"{base}-{counter}"
            counter += 1


async def creer_article(
    titre: str, chapo: str, contenu_html: str, categorie: str,
    tags: list[str], auteur: str, created_by: str,
    image_couverture_url: str | None = None,
    source: str = "manuel",
    publier_immediatement: bool = False,
) -> BlogArticle:
    slug = await generate_unique_article_slug(titre)
    article = BlogArticle(
        slug=slug, titre=titre, chapo=chapo, contenu_html=contenu_html,
        categorie=categorie, tags=tags, auteur=auteur,
        image_couverture_url=image_couverture_url,
        statut="publie" if publier_immediatement else "brouillon",
        source=source, created_by=created_by,
        date_publication=datetime.utcnow() if publier_immediatement else None,
    )
    async with get_session() as session:
        session.add(article)
        await session.commit()
        await session.refresh(article)
    return article


async def publier_article(slug: str) -> BlogArticle:
    async with get_session() as session:
        article = (await session.execute(
            select(BlogArticle).where(BlogArticle.slug == slug)
        )).scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article introuvable")
        article.statut = "publie"
        article.date_publication = article.date_publication or datetime.utcnow()
        article.updated_at = datetime.utcnow()
        session.add(article)
        await session.commit()
        await session.refresh(article)
    return article


async def get_article_publie(slug: str) -> BlogArticle:
    async with get_session() as session:
        article = (await session.execute(
            select(BlogArticle).where(BlogArticle.slug == slug, BlogArticle.statut == "publie")
        )).scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article introuvable")
        return article


async def list_articles_publies(categorie: str | None = None, limit: int = 20, offset: int = 0) -> list[BlogArticle]:
    async with get_session() as session:
        stmt = select(BlogArticle).where(BlogArticle.statut == "publie")
        if categorie:
            stmt = stmt.where(BlogArticle.categorie == categorie)
        stmt = stmt.order_by(BlogArticle.date_publication.desc()).limit(limit).offset(offset)
        return (await session.execute(stmt)).scalars().all()


async def list_articles_similaires(slug_actuel: str, limit: int = 4) -> list[BlogArticle]:
    async with get_session() as session:
        actuel = (await session.execute(
            select(BlogArticle).where(BlogArticle.slug == slug_actuel)
        )).scalar_one_or_none()
        if not actuel:
            return []

        stmt = (
            select(BlogArticle)
            .where(BlogArticle.statut == "publie", BlogArticle.slug != slug_actuel,
                   BlogArticle.categorie == actuel.categorie)
            .order_by(BlogArticle.date_publication.desc()).limit(limit)
        )
        resultats = (await session.execute(stmt)).scalars().all()

        if len(resultats) < limit and actuel.tags:
            deja = {a.id for a in resultats} | {actuel.id}
            candidats = (await session.execute(
                select(BlogArticle).where(BlogArticle.statut == "publie", BlogArticle.id.not_in(deja))
                .order_by(BlogArticle.date_publication.desc()).limit(30)
            )).scalars().all()
            for a in sorted(candidats, key=lambda a: len(set(a.tags or []) & set(actuel.tags)), reverse=True):
                if len(resultats) >= limit:
                    break
                if set(a.tags or []) & set(actuel.tags):
                    resultats.append(a)

        if len(resultats) < limit:
            deja = {a.id for a in resultats} | {actuel.id}
            resultats += (await session.execute(
                select(BlogArticle).where(BlogArticle.statut == "publie", BlogArticle.id.not_in(deja))
                .order_by(BlogArticle.date_publication.desc()).limit(limit - len(resultats))
            )).scalars().all()

        return resultats[:limit]


async def supprimer_article(slug: str) -> None:
    async with get_session() as session:
        article = (await session.execute(
            select(BlogArticle).where(BlogArticle.slug == slug)
        )).scalar_one_or_none()
        if not article:
            raise HTTPException(404, "Article introuvable")
        await session.delete(article)
        await session.commit()


async def list_articles_admin(statut: str | None = None, limit: int = 20, offset: int = 0) -> list[BlogArticle]:
    async with get_session() as session:
        stmt = select(BlogArticle)
        if statut:
            stmt = stmt.where(BlogArticle.statut == statut)
        stmt = stmt.order_by(BlogArticle.created_at.desc()).limit(limit).offset(offset)
        return (await session.execute(stmt)).scalars().all()