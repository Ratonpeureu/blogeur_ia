import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../db";
import { genId } from "../utils";

export interface BlogArticleAttributes {
  id: string;
  slug: string;
  titre: string;
  chapo: string;
  contenuHtml: string;
  categorie: string;
  tags: string[];
  imageCouvertureUrl: string | null;
  auteur: string;
  statut: "brouillon" | "publie" | "archive";
  source: string;
  metaTitle: string | null;
  metaDescription: string | null;
  liensExternes: string[];
  imagesMeta: Record<string, any>[];
  motsClesSeo: string[];
  datePublication: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string;
}

type BlogArticleCreationAttributes = Optional<
  BlogArticleAttributes,
  | "id"
  | "tags"
  | "imageCouvertureUrl"
  | "statut"
  | "source"
  | "metaTitle"
  | "metaDescription"
  | "liensExternes"
  | "imagesMeta"
  | "motsClesSeo"
  | "datePublication"
>;

export class BlogArticle
  extends Model<BlogArticleAttributes, BlogArticleCreationAttributes>
  implements BlogArticleAttributes
{
  public id!: string;
  public slug!: string;
  public titre!: string;
  public chapo!: string;
  public contenuHtml!: string;
  public categorie!: string;
  public tags!: string[];
  public imageCouvertureUrl!: string | null;
  public auteur!: string;
  public statut!: "brouillon" | "publie" | "archive";
  public source!: string;
  public metaTitle!: string | null;
  public metaDescription!: string | null;
  public liensExternes!: string[];
  public imagesMeta!: Record<string, any>[];
  public motsClesSeo!: string[];
  public datePublication!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public createdBy!: string;
}

BlogArticle.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true, defaultValue: genId },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    titre: { type: DataTypes.STRING, defaultValue: "" },
    chapo: { type: DataTypes.STRING, defaultValue: "" },
    contenuHtml: { type: DataTypes.TEXT, defaultValue: "" },
    categorie: { type: DataTypes.STRING, defaultValue: "" },
    tags: { type: DataTypes.JSON, defaultValue: [] },
    imageCouvertureUrl: { type: DataTypes.STRING, allowNull: true },
    auteur: { type: DataTypes.STRING, defaultValue: "" },
    statut: { type: DataTypes.STRING, defaultValue: "brouillon" },
    source: { type: DataTypes.STRING, defaultValue: "manuel" },
    metaTitle: { type: DataTypes.STRING, allowNull: true },
    metaDescription: { type: DataTypes.STRING, allowNull: true },
    liensExternes: { type: DataTypes.JSON, defaultValue: [] },
    imagesMeta: { type: DataTypes.JSON, defaultValue: [] },
    motsClesSeo: { type: DataTypes.JSON, defaultValue: [] },
    datePublication: { type: DataTypes.DATE, allowNull: true },
    createdBy: { type: DataTypes.STRING, defaultValue: "" },
  },
  {
    sequelize,
    tableName: "blog_article",
    indexes: [
      { fields: ["slug"], unique: true },
      { fields: ["categorie"] },
      { fields: ["statut"] },
      { fields: ["source"] },
      { fields: ["datePublication"] },
    ],
  }
);