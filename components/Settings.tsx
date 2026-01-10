
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface SettingsProps {
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage({ text: 'Senha atualizada com sucesso!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || 'Erro ao atualizar senha.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-heading">Segurança</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
          Altere sua senha de acesso abaixo. Recomendamos uma senha forte com pelo menos 6 caracteres.
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border ${
            message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800' 
            : 'bg-red-50 border-red-100 text-red-600 dark:bg-red-950/20 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="text-left relative">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Nova Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-5 py-4 pr-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
                required
                minLength={6}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <div className="text-left">
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Confirmar Nova Senha</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-500 focus:outline-none transition-all shadow-inner"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? 'Processando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
