
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (userId: string, email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          onLogin(data.user.id, data.user.email || email);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          onLogin(data.user.id, data.user.email || email);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl shadow-xl shadow-indigo-100 dark:shadow-none border border-slate-100 dark:border-slate-800 w-full max-w-md text-center">
        <div className="bg-indigo-600 w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 font-heading">
          {isSignUp ? 'Criar sua conta' : 'Bem-vindo de volta'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          {isSignUp ? 'Comece sua jornada de leitura inteligente.' : 'Sua biblioteca espera por você.'}
        </p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800 text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none transition-all text-lg shadow-inner"
              required
            />
          </div>
          <div className="text-left">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none transition-all text-lg shadow-inner"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar Agora'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se gratuitamente'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
