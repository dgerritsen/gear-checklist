import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vervang 'gear-checklist' met je eigen repository naam
  base: '/gear-checklist/',
})
