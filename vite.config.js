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
        // Bind to all interfaces (`host: true`) so other machines on the LAN
        // can connect if desired. `hmr.host` defaults to 'localhost' for
        // local development, but can be overridden with VITE_HMR_HOST in .env
        // (e.g. VITE_HMR_HOST=10.0.0.118) when testing from mobile/LAN devices.
        // Port 5175 avoids collisions with other local projects on 5173/5174.
        host: true,
        port: process.env.VITE_PORT ? Number(process.env.VITE_PORT) : 5175,
        cors: true,
        hmr: {
            host: process.env.VITE_HMR_HOST || 'localhost',
        },
    },
});
