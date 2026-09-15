<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Anti-FOUC: set .dark on <html> synchronously before first paint,
             so there's no flash of the wrong theme. Mirrors the logic in
             resources/js/Components/Theme/ThemeProvider.tsx — keep both in
             sync if the storage key or fallback ever changes. --}}
        <script>
            (function () {
                try {
                    var stored = localStorage.getItem('as-theme');
                    var isDark = stored
                        ? stored === 'dark'
                        : window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                    }
                } catch (e) {
                    // Storage/matchMedia unavailable — default to light.
                }
            })();
        </script>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:wght@400;500;600;700&family=plus-jakarta-sans:wght@400;500;600;700;800&family=jetbrains-mono:wght@500&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
