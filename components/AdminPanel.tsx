
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ReadingPlan } from '../types';

interface UserGroup {
  userId: string;
  email: string;
  plans: ReadingPlan[];
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'critical';
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [entry, ...prev].slice(0, 50));
  };

  const fetchAllData = async () => {
    setLoading(true);
    addLog("Sincronizando registros mestre...", "info");
    try {
      const { data, error } = await supabase
        .from('reading_plans')
        .select('*');

      if (error) {
        addLog(`Falha na API: ${error.message}`, "critical");
        throw error;
      }

      const grouped: Record<string, UserGroup> = {};
      data.forEach((item: any) => {
        if (!grouped[item.user_id]) {
          grouped[item.user_id] = {
            userId: item.user_id,
            email: item.user_email || `ID: ${item.user_id.substring(0, 8)}`,
            plans: []
          };
        }
        grouped[item.user_id].plans.push({
          id: item.id,
          fileName: item.file_name,
          originalFileName: item.original_file_name,
          totalPages: item.total_pages,
          days: item.days,
          currentDayIndex: item.current_day_index,
          lastAccessed: item.last_accessed,
          storagePath: item.storage_path,
          pdfData: ""
        });
      });

      setUsers(Object.values(grouped));
      addLog(`Sincronização completa: ${Object.keys(grouped).length} usuários encontrados.`, "success");
    } catch (err: any) {
      addLog(`Erro crítico: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const copyManualSQL = (user: UserGroup) => {
    const sql = `BEGIN;
  DELETE FROM storage.objects WHERE owner = '${user.userId}';
  DELETE FROM public.reading_plans WHERE user_id = '${user.userId}';
  DELETE FROM auth.users WHERE id = '${user.userId}';
COMMIT;`;
    
    navigator.clipboard.writeText(sql);
    addLog(`SQL de emergência para ${user.email} copiado para o clipboard.`, "info");
    alert("Script SQL copiado! Use o SQL Editor do Supabase para rodar este comando.");
  };

  const deleteUserData = async (userId: string) => {
    const user = users.find(u => u.userId === userId);
    if (!user) return;

    if (!confirm(`Deseja tentar a exclusão automática de ${user.email}?`)) return;
    
    setDeletingId(userId);
    addLog(`Iniciando pipeline de destruição para ${user.email}...`, "warning");

    try {
      // 1. TENTAR AUTH (EDGE FUNCTION)
      addLog("Fase 1: Removendo credenciais de login via Edge Function...", "info");
      try {
        const { error: authError } = await supabase.functions.invoke('admin-delete-user', {
          body: { userId }
        });
        if (authError) addLog("Fase 1 falhou (Edge Function não configurada).", "warning");
        else addLog("Fase 1 concluída: Acesso revogado.", "success");
      } catch (e) {
        addLog("Fase 1 ignorada: Edge Function ausente.", "info");
      }

      // 2. STORAGE
      const filePaths = user.plans.filter(p => p.storagePath).map(p => p.storagePath!);
      if (filePaths.length > 0) {
        addLog(`Fase 2: Removendo ${filePaths.length} arquivos do Cloud Storage...`, "info");
        const { error: sErr } = await supabase.storage.from('pdfs').remove(filePaths);
        if (sErr) addLog(`Erro Storage: ${sErr.message}`, "error");
        else addLog("Fase 2 concluída.", "success");
      }

      // 3. DATABASE
      addLog("Fase 3: Limpando metadados no banco de dados...", "info");
      const { error: dbErr } = await supabase.from('reading_plans').delete().eq('user_id', userId);
      if (dbErr) throw dbErr;

      addLog(`Sucesso! Todos os dados de ${user.email} foram apagados.`, "success");
      setUsers(prev => prev.filter(u => u.userId !== userId));
      alert("Operação concluída com sucesso.");

    } catch (err: any) {
      addLog(`ERRO NO PIPELINE: ${err.message}`, "critical");
      alert(`Erro: ${err.message}. Tente usar o botão de 'Gerar SQL' se o problema persistir.`);
    } finally {
      setDeletingId(null);
    }
  };

  const stats = {
    totalUsers: users.length,
    totalBooks: users.reduce((acc, u) => acc + u.plans.length, 0),
    totalPages: users.reduce((acc, u) => acc + u.plans.reduce((pa, p) => pa + p.totalPages, 0), 0)
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 font-heading tracking-tight">Administração</h2>
          <p className="text-slate-500 dark:text-slate-400">Monitoramento de tráfego e integridade da rede.</p>
        </div>
        <button onClick={fetchAllData} className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Usuários" value={stats.totalUsers} color="indigo" />
        <StatCard title="Livros" value={stats.totalBooks} color="emerald" />
        <StatCard title="Páginas" value={stats.totalPages.toLocaleString()} color="amber" />
      </div>

      <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_#6366f1]"></div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Terminal de Auditoria</h3>
          </div>
          <button onClick={() => setLogs([])} className="text-[10px] text-slate-600 hover:text-white transition-colors uppercase font-bold">Flush Logs</button>
        </div>
        <div className="h-40 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2">
          {logs.length === 0 ? (
            <p className="text-slate-700 italic">Aguardando eventos do sistema...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`flex gap-3 leading-relaxed ${
                log.type === 'error' || log.type === 'critical' ? 'text-red-400' : 
                log.type === 'success' ? 'text-emerald-400' : 
                log.type === 'warning' ? 'text-amber-400' : 'text-slate-500'
              }`}>
                <span className="opacity-30 shrink-0">[{log.timestamp}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5">Identidade do Usuário</th>
                <th className="px-8 py-5">Conteúdo</th>
                <th className="px-8 py-5 text-right">Ações de Segurança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((user) => (
                <tr key={user.userId} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-8 py-7">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-base">{user.email}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5 opacity-60">ID: {user.userId}</p>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex flex-wrap gap-2">
                      {user.plans.map(p => (
                        <div key={p.id} className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-bold">
                          {p.fileName}
                        </div>
                      ))}
                      {user.plans.length === 0 && <span className="text-xs text-slate-400 italic">Vazio</span>}
                    </div>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => copyManualSQL(user)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-2xl transition-all active:scale-90"
                        title="Copiar SQL Manual"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m16 18 2 2 4-4"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7h8"/><path d="M8 12h8"/><path d="M8 17h4"/></svg>
                      </button>
                      <button 
                        onClick={() => deleteUserData(user.userId)}
                        disabled={deletingId === user.userId}
                        className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${
                          deletingId === user.userId 
                          ? 'bg-slate-100 text-slate-400' 
                          : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white'
                        }`}
                      >
                        {deletingId === user.userId ? '...' : 'EXCLUIR'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }: any) => {
  const colors: any = {
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/30"
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-4xl font-black text-slate-800 dark:text-slate-100">{value}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]} transition-transform group-hover:scale-110`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
