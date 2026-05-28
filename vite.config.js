/**
 * LAN / mobile testing (same Wi‑Fi):
 * - Set VITE_DEV_HOST to this PC's LAN IP (see ipconfig). Leave unset for normal localhost dev.
 * - Run `composer run dev:lan` so Laravel listens on 0.0.0.0:8000.
 * - Set APP_URL=http://<LAN-IP>:8000 while testing from other devices (Vite CORS + Ziggy).
 * - Windows may need inbound firewall rules for TCP 8000 and 5173 on Private networks.
 */
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import process from 'node:process';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const port = 5173;
    const devHost = env.VITE_DEV_HOST || 'localhost';

    return {
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                ssr: 'resources/js/ssr.jsx',
                refresh: true,
            }),
            react(),
            tailwindcss(),
        ],
        esbuild: {
            jsx: 'automatic',
        },
        server: {
            host: true,
            port,
            strictPort: true,
            // Do not set `server.origin` to the LAN URL: Vite then sends
            // Access-Control-Allow-Origin for that origin only, and ES module
            // requests from http://localhost:8000 are blocked (white screen).
            // The Laravel plugin writes `public/hot` using `hmr.host` + the
            // listening port when `origin` is not overridden.
            hmr: {
                host: devHost,
            },
            // Allow both localhost and LAN browser origins to load /@vite/client
            // and modules (different host:8000 vs host:5173 counts as cross-origin).
            cors: true,
        },
    };
});