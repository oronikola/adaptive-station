import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/motion') || id.includes('node_modules/@motionone')) {
                        return 'vendor-motion';
                    }
                },
            },
        },
    },
    server: {
        // Bind to the LAN IP (not 127.0.0.1) so `public/hot` points browsers
        // on other machines at a reachable address instead of their own
        // loopback. `host: true` listens on all interfaces; `hmr.host` pins
        // the URL written into `public/hot` and used for the HMR websocket
        // to this machine's actual LAN address so it resolves from anywhere
        // on the network, not just this PC.
        host: true,
        cors: true,
        hmr: {
            host: '192.168.1.10',
        },
    },
});
