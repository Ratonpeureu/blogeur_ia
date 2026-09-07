from datetime import datetime
from typing import List, Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text

from blogueur_ia.utils import gen_id


class BlogArticle(SQLModel, table=True):
    __tablename__ = "blog_article"

    id: str = Field(default_factory=gen_id, primary_key=True)
    slug: str = Field(index=True, unique=True)
    titre: str = Field(default="")
    chapo: str = Field(default="")
    contenu_html: str = Field(default="", sa_column=Column(Text))

    categorie: str = Field(default="", index=True)
    tags: List[str] = Field(default=[], sa_column=Column(JSON))

    image_couverture_url: Optional[str] = Field(default=None)
    auteur: str = Field(default="")

    statut: str = Field(default="brouillon", index=True, description="brouillon | publie | archive")
    source: str = Field(default="manuel", index=True, description="manuel | auto_release | ia_admin")

    meta_title: Optional[str] = Field(default=None)
    meta_description: Optional[str] = Field(default=None)

    liens_externes: List[str] = Field(default=[], sa_column=Column(JSON))
    images_meta: List[dict] = Field(default=[], sa_column=Column(JSON))
    mots_cles_seo: List[str] = Field(default=[], sa_column=Column(JSON))

    date_publication: Optional[datetime] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str = Field(default="")