<?php

namespace Tests\Feature\Security;

use Symfony\Component\Finder\Finder;
use Tests\TestCase;

/**
 * Enforces the settled MVP decision (DATA_OWNERSHIP_AND_TENANT_MODEL.md):
 * the legacy tapbunker SMS queue is archived, not kept running, and
 * Adaptive Station's own SMS gateway (IP-007) must never read/write it or
 * contact the legacy essentiel.ph backend.
 */
class NoLegacySmsBackendContactTest extends TestCase
{
    public function test_app_code_never_contacts_tapbunker_or_essentiel(): void
    {
        $offenders = [];

        foreach (Finder::create()->files()->in(app_path())->name('*.php') as $file) {
            // Several files *document* why they deliberately avoid the
            // legacy system (see IP-007) — that mention belongs only in
            // comments. Strip them so this test catches actual code contact
            // (a URL, a query, a class name) rather than the documentation
            // of its own absence.
            $code = preg_replace(['#/\*.*?\*/#s', '#//[^\n]*#'], '', $file->getContents());

            if (stripos($code, 'tapbunker') !== false || stripos($code, 'essentiel') !== false) {
                $offenders[] = $file->getRelativePathname();
            }
        }

        $this->assertEmpty($offenders, 'These files contain non-comment references to the legacy tapbunker/essentiel.ph system: '.implode(', ', $offenders));
    }
}
