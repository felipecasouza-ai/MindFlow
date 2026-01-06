
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do diretório raiz (.)
  const env = loadEnv(mode, '.', '');
  
  // Prioridade: 1. VITE_GEMINI_API_KEY | 2. GEMINI_API_KEY | 3. API_KEY
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.API_KEY;

  return {
    
    plugins: [react()],
    define: {
      // Injeta a chave encontrada no processo global para o SDK do Gemini
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    server: {
      port: 5173,
      open: true
    },
    base: './'
  };
});
