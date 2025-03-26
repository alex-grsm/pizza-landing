import { defineConfig } from 'vite';
import path from 'path';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import htmlMinifier from 'vite-plugin-html-minifier-terser';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
    base: './',
    build: {
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                  const ext = path.extname(assetInfo.name).toLowerCase();
                  const name = path.basename(assetInfo.name, ext);
        
                  if (['.png', '.jpg', '.jpeg', '.svg', '.gif', '.tiff', '.bmp', '.ico', '.webp', '.mp4'].includes(ext)) {
                    return `assets/img/${name}${ext}`;
                  }
                  if (['.woff', '.woff2', '.eot', '.ttf', '.otf'].includes(ext)) {
                    return `assets/fonts/${name}${ext}`;
                  }
                  if (ext === '.css') {
                    return `assets/css/${name}${ext}`;
                  }
                  return `assets/js/${name}${ext}`;
                },
                chunkFileNames: 'assets/js/[name].js',
                entryFileNames: 'assets/js/[name].js',
              },
            },
        assetsInlineLimit: 4096,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
    css: {
        postcss: './postcss.config.js',
    },
    plugins: [
        ViteEjsPlugin({
            title: "Pizza"
        }),
        {
            name: 'watch-ejs',
            handleHotUpdate({ file, server }) {
                if (file.endsWith('.ejs')) {
                    server.ws.send({ type: 'full-reload' });
                }
            },
        },
        ViteImageOptimizer({
            png: {
                quality: 80,
            },
            jpeg: {
                quality: 80,
            },
            jpg: {
                quality: 80,
            },
            webp: {
                lossless: true,
            },
        }),
        htmlMinifier({
            minify: true,
        }),
        viteStaticCopy({
            targets: [
                {
                    src: 'src/data/products.json',
                    dest: 'data'
                }
            ]
        })
    ],
    server: {
        port: 3000,
        open: true,
        strictPort: false,
        cors: true,
        hmr: {
            overlay: true,
        }
    },
});
