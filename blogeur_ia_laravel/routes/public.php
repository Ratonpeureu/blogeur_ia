<?php

use BlogueurIa\Http\Controllers\BlogPublicController;
use Illuminate\Support\Facades\Route;

Route::get('/api/blog/articles', [BlogPublicController::class, 'index']);
Route::get('/api/blog/articles/{slug}', [BlogPublicController::class, 'show']);
Route::get('/api/blog/articles/{slug}/suggestions', [BlogPublicController::class, 'suggestions']);