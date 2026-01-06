
import React from 'react';
import { User, ReadingPlan, ThemeMode } from '../types';

interface HeaderProps {
  onViewChange: (view: 'library' | 'dashboard' | 'stats') => void;
  user: User | null;
  onLogout: () => void;
  activePlan: ReadingPlan | null;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

const Header: React.FC<HeaderProps> = ({ onViewChange, user, onLogout, activePlan, theme, onThemeChange }) => {
  const ThemeIcon = () => {
    switch(theme) {
      case 'dark': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
      case 'light': return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
      default: return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>;
    }
  };

  const nextTheme = (): ThemeMode => {
    if (theme === 'system') return 'light';
    if (theme === 'light') return 'dark';
    return 'system';
  };

  return (
    <header className="sticky top-0 z-50 glass dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 py-4 shadow-sm">
      <div className="container mx-auto px-4 flex justify-between items-center max-w-6xl">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => user && onViewChange('library')}
        >
          <div className="w-10 h-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="50" cy="50" r="48" fill="#15803d" />
              <circle cx="50" cy="50" r="48" fill="#22c55e" fillOpacity="0.8" />
              <path d="M15 40 Q 50 15 85 40" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.6" />
              <path d="M10 60 Q 50 35 90 60" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
              <path d="M20 80 Q 50 60 80 80" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>
          <span className="text-2xl font-bold font-heading hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-indigo-600 tracking-tight">
            MindFlow
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && (
            <nav className="flex items-center gap-1 sm:gap-2 mr-2">
              <button onClick={() => onViewChange('library')} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors text-sm sm:text-base">Biblioteca</button>
              {activePlan && (
                <>
                  <button onClick={() => onViewChange('dashboard')} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors text-sm sm:text-base">Painel</button>
                  <button onClick={() => onViewChange('stats')} className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors text-sm sm:text-base">Estatística</button>
                </>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-4">
            <button 
              onClick={() => onThemeChange(nextTheme())}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all active:scale-90 flex items-center gap-2"
            >
              <ThemeIcon />
            </button>

            {user && (
              <div className="flex items-center gap-2 ml-2">
                <div className="hidden md:block text-right mr-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">Usuário</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-none">{user.username.toUpperCase()}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all" title="Sair">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
