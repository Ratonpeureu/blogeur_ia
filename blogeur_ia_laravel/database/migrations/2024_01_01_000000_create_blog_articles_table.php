<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_articles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('titre')->default('');
            $table->string('chapo')->default('');
            $table->longText('contenu_html')->nullable();

            $table->string('categorie')->default('')->index();
            $table->json('tags')->nullable();

            $table->string('image_couverture_url')->nullable();
            $table->string('auteur')->default('');

            $table->string('statut')->default('brouillon')->index(); // brouillon | publie | archive
            $table->string('source')->default('manuel')->index();    // manuel | auto_release | ia_admin

            $table->string('meta_title')->nullable();
            $table->string('meta_description')->nullable();

            $table->json('liens_externes')->nullable();
            $table->json('images_meta')->nullable();
            $table->json('mots_cles_seo')->nullable();

            $table->timestamp('date_publication')->nullable()->index();
            $table->string('created_by')->default('');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_articles');
    }
};