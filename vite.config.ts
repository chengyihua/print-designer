import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import { resolve } from 'path';

export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
            include: ['src/lib/**/*'],
            outDir: 'dist',
        }),
        cssInjectedByJsPlugin(), // CSS 会自动注入到 JS 中
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/lib/index.ts'),
            name: 'PrintDesigner',
            formats: ['es', 'umd'],
            fileName: (format) => `print-designer.${format}.js`,
        },
        rollupOptions: {
            // 外部化依赖，不打包进库中
            external: ['react', 'react-dom'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                },
            },
        },
        sourcemap: true,
        // 输出目录
        outDir: 'dist',
    },
});
