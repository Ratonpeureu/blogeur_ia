<?php

use BlogueurIa\Http\Controllers\BlogAdminController;
use Illuminate\Support\Facades\Route;

Route::get('/admin/blog/categories', [BlogAdminController::class, 'categories']);
Route::get('/admin/blog', [BlogAdminController::class, 'index']);
Route::post('/admin/blog/draft-from-release', [BlogAdminController::class, 'draftFromRelease']);
Route::post('/admin/blog/generate', [BlogAdminController::class, 'generate']);
Route::delete('/admin/blog/{slug}', [BlogAdminController::class, 'destroy']);