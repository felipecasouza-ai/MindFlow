
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do diretório raiz
  const env = loadEnv(mode, process.cwd(), '');
  
  // Prioridade: VITE_GEMINI_API_KEY -> GEMINI_API_KEY -> API_KEY
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY || "";

  return {
    base: './', // Mantém caminhos relativos para funcionar em qualquer subdiretório
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    server: {
      port: 5173,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});
