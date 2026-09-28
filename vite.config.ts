import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build: the wallet (lcw-front-end) bundles this package, so React,
// the WAS client, and papaparse stay external, and the Tailwind classes in
// the JSX are compiled by the consumer (via an @source directive).
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, '@interop/was-client', 'papaparse'],
    },
  },
})
