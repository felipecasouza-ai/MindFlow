
import React, { useState } from 'react';

interface AuthProps {
  onLogin: (username: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length >= 3) {
      onLogin(username.trim().toLowerCase());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 w-full max-w-md text-center">
        <div className="bg-indigo-600 w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-heading">Bem-vindo ao MindFlow</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Sua jornada de leitura inteligente começa aqui.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">Seu Nome de Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: joao_leitor"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none transition-all text-lg shadow-inner"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95"
          >
            Entrar Agora
          </button>
        </form>
        
        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          Seus livros e progresso ficam guardados localmente no seu computador.
        </p>
      </div>
    </div>
  );
};

export default Auth;
