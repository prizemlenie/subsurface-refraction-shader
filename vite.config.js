import restart from 'vite-plugin-restart';
import { compression } from 'vite-plugin-compression2';

export default {
    root: 'src/',
    publicDir: '../static/',
    base: './',
    server: {
        host: true,
        open: true,
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        sourcemap: true,
    },
    plugins: [
        restart({ restart: ['../static/**'] }),
        compression({
            exclude: /index\.html/,
            algorithm: 'brotliCompress',
            deleteOriginalAssets: true,
            filename: '[path][base]',
        }),
    ],
};
