<?php

namespace Tests\Feature\Security;

use Symfony\Component\Finder\Finder;
use Tests\TestCase;

/**
 * Enforces the settled MVP decision (DATA_OWNERSHIP_AND_TENANT_MODEL.md):
 * the legacy tapbunker SMS queue is archived, not kept running, and
 * Adaptive Station's own SMS gateway (IP-007) must never read/write it —
 * true for every tenant, essentiel-sourced or not. `tapbunker` itself stays
 * a hard, code-wide ban (no allowlist entry below may ever reference it).
 *
 * Contact with essentiel's *own* API is narrower: the 2026-09-14 update to
 * that doc allows it, but only for a school onboarded specifically as an
 * essentiel-sourced client, through the specific opt-in `essentiel_api`
 * integration driver — not a general dependency the rest of the app can
 * casually reach for. ESSENTIEL_ALLOWLIST is that driver's complete file
 * set; anything outside it must stay essentiel-free.
 */
class NoLegacySmsBackendContactTest extends TestCase
{
    private const ESSENTIEL_ALLOWLIST = [
        'Http/Controllers/Api/Device/TapEventResolveController.php',
        'Http/Controllers/Platform/TenantController.php',
        'Http/Controllers/Portal/IntegrationProfileController.php',
        'Http/Requests/Platform/StoreTenantRequest.php',
        'Jobs/PushTapEventToEssentielJob.php',
        'Models/TapEvent.php',
        'Services/Integrations/EssentielApiConnector.php',
        'Services/Integrations/EssentielTapResolver.php',
    ];

    public function test_app_code_never_contacts_tapbunker_or_essentiel_outside_the_opted_in_driver(): void
    {
        $offenders = [];

        foreach (Finder::create()->files()->in(app_path())->name('*.php') as $file) {
            // Several files *document* why they deliberately avoid the
            // legacy system (see IP-007) — that mention belongs only in
            // comments. Strip them so this test catches actual code contact
            // (a URL, a query, a class name) rather than the documentation
            // of its own absence.
            $code = preg_replace(['#/\*.*?\*/#s', '#//[^\n]*#'], '', $file->getContents());

            if (stripos($code, 'tapbunker') !== false) {
                $offenders[] = $file->getRelativePathname();

                continue;
            }

            // Finder yields OS-native separators (backslash on Windows);
            // normalize before comparing against the forward-slash allowlist.
            $normalizedPath = str_replace('\\', '/', $file->getRelativePathname());

            if (stripos($code, 'essentiel') !== false && ! in_array($normalizedPath, self::ESSENTIEL_ALLOWLIST, true)) {
                $offenders[] = $file->getRelativePathname();
            }
        }

        $this->assertEmpty($offenders, 'These files contain non-comment references to the legacy tapbunker/essentiel.ph system outside the opted-in essentiel_api driver: '.implode(', ', $offenders));
    }
}
