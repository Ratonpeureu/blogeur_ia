<?php

namespace BlogueurIa\Support;

use Illuminate\Support\Str;

class Slugify
{
    public static function make(string $texte, int $maxLen = 90): string
    {
        return Str::limit(Str::slug($texte), $maxLen, '');
    }
}