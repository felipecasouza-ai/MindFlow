
import React, { useState } from 'react';
import { ReadingPlan, ReadingDay } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, PieChart, Pie } from 'recharts';

interface StatsProps {
  activePlan: ReadingPlan;
  allPlans: ReadingPlan[];
}

const Stats: React.FC<StatsProps> = ({ activePlan, allPlans }) => {
  const [viewMode, setViewMode] = useState<'active' | 'global'>('active');

  // Helper to format seconds
  const formatSeconds = (secs: number) => {
    if (secs === 0 || isNaN(secs)) return "--";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ACTIVE PLAN CALCULATIONS
  const activeCompletedDays = activePlan.days.filter(d => d.isCompleted);
  const activeAvgScore = activeCompletedDays.length > 0 
    ? (activeCompletedDays.reduce((acc, d) => acc + (d.quizScore || 0), 0) / activeCompletedDays.length).toFixed(1)
    : "0.0";
  const activeTotalTime = activeCompletedDays.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0);
  const activeTotalPages = activeCompletedDays.reduce((acc, d) => acc + (d.endPage - d.startPage + 1), 0);
  const activeTimePerPage = activeTotalPages > 0 ? activeTotalTime / activeTotalPages : 0;
  
  const activeChartData = activePlan.days.map(d => ({
    name: `Dia ${d.dayNumber}`,
    score: d.quizScore || 0,
    tempo: Math.round((d.timeSpentSeconds || 0) / 60 * 10) / 10,
    status: d.isCompleted ? 'Concluído' : 'Pendente'
  })).slice(0, Math.max(activePlan.currentDayIndex + 5, 10));

  // GLOBAL CALCULATIONS
  const allCompletedDays = allPlans.flatMap(p => p.days.filter(d => d.isCompleted));
  const globalTotalBooks = allPlans.length;
  const globalFinishedBooks = allPlans.filter(p => p.days.every(d => d.isCompleted)).length;
  const globalTotalPages = allPlans.reduce((acc, p) => acc + p.days.filter(d => d.isCompleted).reduce((pa, d) => pa + (d.endPage - d.startPage + 1), 0), 0);
  const globalTotalTime = allPlans.reduce((acc, p) => acc + p.days.reduce((ta, d) => ta + (d.timeSpentSeconds || 0), 0), 0);
  const globalAvgScore = allCompletedDays.length > 0 
    ? (allCompletedDays.reduce((acc, d) => acc + (d.quizScore || 0), 0) / allCompletedDays.length).toFixed(1)
    : "0.0";

  // Chart data for Library Comparison (Completion %)
  const libraryComparisonData = allPlans.map(p => {
    const done = p.days.filter(d => d.isCompleted).length;
    const total = p.days.length;
    return {
      name: p.fileName.length > 15 ? p.fileName.substring(0, 15) + '...' : p.fileName,
      fullName: p.fileName,
      progresso: Math.round((done / total) * 100),
      paginas: p.days.filter(d => d.isCompleted).reduce((acc, d) => acc + (d.endPage - d.startPage + 1), 0),
      tempoMinutos: Math.round(p.days.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0) / 60)
    };
  });

  // Chart data for Time Distribution by Book
  const timeDistData = allPlans.map(p => ({
    name: p.fileName.length > 10 ? p.fileName.substring(0, 10) + '...' : p.fileName,
    value: Math.round(p.days.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0) / 60)
  })).filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header with Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-heading tracking-tight">Estatísticas</h2>
          <p className="text-slate-500 dark:text-slate-400">Acompanhe seu desempenho individual e coletivo.</p>
        </div>
        
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
          <button 
            onClick={() => setViewMode('active')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold text-xs transition-all ${viewMode === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}
          >
            Plano Ativo
          </button>
          <button 
            onClick={() => setViewMode('global')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-xl font-bold text-xs transition-all ${viewMode === 'global' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}
          >
            Biblioteca Global
          </button>
        </div>
      </div>

      {viewMode === 'active' ? (
        <>
          {/* ACTIVE PLAN VIEW */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-grow">
                <h3 className="text-xl font-bold mb-1 font-heading">Foco: {activePlan.fileName}</h3>
                <p className="opacity-80 text-sm leading-relaxed max-w-md">
                  Seu progresso atual é de <span className="font-bold">{Math.round((activeCompletedDays.length / activePlan.days.length) * 100)}%</span>. 
                  Baseado no seu ritmo de <span className="font-bold">{formatSeconds(activeTimePerPage)} por página</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 shrink-0 w-full md:w-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Ritmo Médio</p>
                  <p className="text-2xl font-black">{formatSeconds(activeTimePerPage)}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Lido</p>
                  <p className="text-2xl font-black">{activeTotalPages} <span className="text-xs opacity-50">pág</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatBox title="Quiz Score" value={activeAvgScore} sub="/ 5.0" color="emerald" />
            <StatBox title="Tempo de Leitura" value={formatSeconds(activeTotalTime)} color="indigo" />
            <StatBox title="Metas Batidas" value={activeCompletedDays.length} sub={`/ ${activePlan.days.length}`} color="amber" />
            <StatBox title="Média Pág/Dia" value={activeCompletedDays.length > 0 ? Math.round(activeTotalPages / activeCompletedDays.length) : "--"} color="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Evolução das Notas (Active Plan)">
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={20}>
                      {activeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 2.5 ? '#6366f1' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tempo por Dia (Minutos)">
               <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={activeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="tempo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                  </LineChart>
               </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      ) : (
        <>
          {/* GLOBAL LIBRARY VIEW */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-12 items-center">
            <div className="shrink-0 relative">
               <div className="w-32 h-32 rounded-full border-8 border-indigo-50 dark:border-indigo-950 flex items-center justify-center">
                  <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{globalFinishedBooks}</span>
               </div>
               <p className="text-[10px] font-black uppercase text-slate-400 mt-2 text-center tracking-widest">Lidos com sucesso</p>
            </div>
            <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-8">
               <GlobalStat label="Total de Livros" value={globalTotalBooks} icon="📚" />
               <GlobalStat label="Páginas Consumidas" value={globalTotalPages} icon="📄" />
               <GlobalStat label="Horas de Estudo" value={(globalTotalTime / 3600).toFixed(1)} icon="⏳" />
               <GlobalStat label="Média Global Quiz" value={globalAvgScore} icon="⭐" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ChartCard title="Progresso da Biblioteca (%)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={libraryComparisonData} margin={{ left: 40, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
                    <Bar dataKey="progresso" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                        {libraryComparisonData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div>
              <ChartCard title="Distribuição de Tempo">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={timeDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {timeDistData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Library Summary Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Sumário da Estante</h3>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <tr>
                         <th className="px-6 py-4">Obra</th>
                         <th className="px-6 py-4">Meta</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4">Tempo Total</th>
                         <th className="px-6 py-4 text-right">Avg Quiz</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allPlans.map(p => {
                         const done = p.days.filter(d => d.isCompleted).length;
                         const total = p.days.length;
                         const pTime = p.days.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0);
                         const pScores = p.days.filter(d => d.quizScore !== undefined).map(d => d.quizScore!);
                         const pAvg = pScores.length > 0 ? (pScores.reduce((a, b) => a + b, 0) / pScores.length).toFixed(1) : "--";
                         
                         return (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                               <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[200px]">{p.fileName}</p>
                                  <p className="text-[10px] text-slate-400">{p.totalPages} páginas</p>
                               </td>
                               <td className="px-6 py-4 text-xs font-bold text-slate-500">{done} / {total} metas</td>
                               <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${done === total ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'}`}>
                                     {done === total ? 'Finalizado' : 'Em curso'}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-xs font-mono text-slate-500">{formatSeconds(pTime)}</td>
                               <td className="px-6 py-4 text-right">
                                  <span className="font-black text-slate-700 dark:text-slate-300">{pAvg}</span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatBox = ({ title, value, sub, color }: any) => {
  const colorMap: any = {
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    teal: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30"
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-black ${colorMap[color].split(' ')[0]}`}>{value}</span>
        {sub && <span className="text-slate-400 font-bold text-sm">{sub}</span>}
      </div>
    </div>
  );
};

const GlobalStat = ({ label, value, icon }: any) => (
   <div className="space-y-1">
      <div className="flex items-center gap-2">
         <span className="text-lg">{icon}</span>
         <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{label}</p>
      </div>
      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</p>
   </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">{title}</h3>
    {children}
  </div>
);

export default Stats;
