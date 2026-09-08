<?php

namespace App\Http\Controllers\Api\ParentPortal;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChildrenController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $parent = $request->attributes->get('parent_account');

        $children = $parent->authorizedStudents()
            ->orderBy('display_name')
            ->get(['id', 'display_name', 'grade_level', 'section', 'photo_url']);

        return response()->json(['children' => $children]);
    }
}
