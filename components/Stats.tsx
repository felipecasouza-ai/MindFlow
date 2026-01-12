
import React, { useState } from 'react';
import { ReadingPlan, ReadingDay } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, PieChart, Pie, ReferenceLine, Label, LabelList } from 'recharts';

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
  const activeTotalPagesRead = activeCompletedDays.reduce((acc, d) => acc + (d.endPage - d.startPage + 1), 0);
  const activeTimePerPage = activeTotalPagesRead > 0 ? activeTotalTime / activeTotalPagesRead : 0;
  
  // Estimation for completion
  const activeRemainingPages = Math.max(0, activePlan.totalPages - activeTotalPagesRead);
  const activeEstimatedTimeRemaining = activeRemainingPages * activeTimePerPage;

  const activeAvgTimePerDay = activeCompletedDays.length > 0 ? activeTotalTime / activeCompletedDays.length : 0;
  const activeAvgMinutesPerDay = activeAvgTimePerDay / 60;

  const activeChartData = activePlan.days.map(d => ({
    name: `Dia ${d.dayNumber}`,
    score: d.quizScore || 0,
    tempo: d.isCompleted ? Math.round((d.timeSpentSeconds || 0) / 60 * 10) / 10 : null,
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

  // New Global KPIs
  const globalAvgTimePerDay = allCompletedDays.length > 0 ? globalTotalTime / allCompletedDays.length : 0;
  const globalAvgPacePerPage = globalTotalPages > 0 ? globalTotalTime / globalTotalPages : 0;

  // Chart data for Library Comparison
  const libraryComparisonData = allPlans.map(p => {
    const done = p.days.filter(d => d.isCompleted).length;
    const total = p.days.length;
    const prog = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      name: p.fileName.length > 12 ? p.fileName.substring(0, 12) + '...' : p.fileName,
      fullName: p.fileName,
      progresso: prog,
      label: `${prog}%`
    };
  }).sort((a, b) => b.progresso - a.progresso);

  // Chart data for Time Distribution by Book
  const timeDistData = allPlans.map(p => ({
    name: p.fileName.length > 15 ? p.fileName.substring(0, 15) + '...' : p.fileName,
    fullName: p.fileName,
    value: Math.round(p.days.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0) / 60)
  })).filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">{payload[0].payload.fullName || label}</p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-black">
            {payload[0].name}: {payload[0].value}{payload[0].unit || (payload[0].dataKey === 'progresso' ? '%' : ' min')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header with Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-heading tracking-tight">Estatísticas</h2>
          <p className="text-slate-500 dark:text-slate-400">Dados granulares da sua jornada intelectual.</p>
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
                  Seu progresso atual é de <span className="font-bold">{activePlan.days.length > 0 ? Math.round((activeCompletedDays.length / activePlan.days.length) * 100) : 0}%</span>. 
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
                  <p className="text-2xl font-black">{activeTotalPagesRead} <span className="text-xs opacity-50">pág</span></p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatBox title="Quiz Score" value={activeAvgScore} sub="/ 5.0" color="emerald" />
            <StatBox title="Tempo Total" value={formatSeconds(activeTotalTime)} color="indigo" />
            <StatBox title="Média Tempo/Dia" value={formatSeconds(activeAvgTimePerDay)} color="indigo" />
            <StatBox title="Término Estimado" value={formatSeconds(activeEstimatedTimeRemaining)} color="rose" />
            <StatBox title="Metas Batidas" value={activeCompletedDays.length} sub={`/ ${activePlan.days.length}`} color="amber" />
            <StatBox title="Média Pág/Dia" value={activeCompletedDays.length > 0 ? Math.round(activeTotalPagesRead / activeCompletedDays.length) : "--"} color="teal" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Evolução das Notas">
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={20} name="Pontuação">
                      {activeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 2.5 ? '#6366f1' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tempo por Sessão (Minutos)">
               <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={activeChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="tempo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} connectNulls name="Minutos" />
                    {activeAvgMinutesPerDay > 0 && (
                      <ReferenceLine y={Math.round(activeAvgMinutesPerDay * 10) / 10} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={2}>
                        <Label value={`Média: ${Math.round(activeAvgMinutesPerDay * 10) / 10}m`} position="insideTopRight" fill="#f43f5e" fontSize={10} fontWeight="bold" />
                      </ReferenceLine>
                    )}
                  </LineChart>
               </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      ) : (
        <>
          {/* GLOBAL LIBRARY VIEW */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
               <GlobalStat label="Livros" value={globalTotalBooks} icon="📚" />
               <GlobalStat label="Finalizados" value={globalFinishedBooks} icon="✅" />
               <GlobalStat label="Páginas" value={globalTotalPages} icon="📄" />
               <GlobalStat label="Tempo/Dia" value={formatSeconds(globalAvgTimePerDay)} icon="⏳" />
               <GlobalStat label="Ritmo/Pág" value={formatSeconds(globalAvgPacePerPage)} icon="⚡" />
               <GlobalStat label="Média Quiz" value={globalAvgScore} icon="⭐" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ChartCard title="Progresso da Estante">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart layout="vertical" data={libraryComparisonData} margin={{ left: 10, right: 60, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                    <Bar dataKey="progresso" radius={[0, 6, 6, 0]} barSize={24} name="Concluído">
                        {libraryComparisonData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                        ))}
                        <LabelList dataKey="label" position="right" fill="#64748b" fontSize={11} fontWeight="bold" offset={10} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div>
              <ChartCard title="Esforço por Obra">
                <div className="relative h-[320px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={timeDistData}
                        cx="50%"
                        cy="45%"
                        innerRadius={75}
                        outerRadius={100}
                        paddingAngle={6}
                        dataKey="value"
                        stroke="none"
                        >
                        {timeDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b' }} />
                    </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Total</p>
                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">{Math.round(globalTotalTime / 60)}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">minutos</p>
                    </div>
                </div>
              </ChartCard>
            </div>
          </div>

          {/* Library Summary Table */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Inventário Intelectual</h3>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">{allPlans.length} Livros Registrados</span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                      <tr>
                         <th className="px-8 py-5">Título da Obra</th>
                         <th className="px-8 py-5">Progresso</th>
                         <th className="px-8 py-5">Tempo Investido</th>
                         <th className="px-8 py-5 text-right">Quiz Avg</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allPlans.map(p => {
                         const done = p.days.filter(d => d.isCompleted).length;
                         const total = p.days.length;
                         const pTime = p.days.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0);
                         const pScores = p.days.filter(d => d.quizScore !== undefined).map(d => d.quizScore!);
                         const pAvg = pScores.length > 0 ? (pScores.reduce((a, b) => a + b, 0) / pScores.length).toFixed(1) : "--";
                         const isDone = done === total && total > 0;
                         const progressRatio = total > 0 ? Math.round((done / total) * 100) : 0;
                         
                         return (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                               <td className="px-8 py-6">
                                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[250px]">{p.fileName}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">{p.totalPages} páginas</p>
                               </td>
                               <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                          <div className={`h-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressRatio}%` }} />
                                      </div>
                                      <span className="text-[10px] font-black text-slate-500">{done}/{total}</span>
                                  </div>
                               </td>
                               <td className="px-8 py-6 text-xs font-mono font-bold text-slate-500">{formatSeconds(pTime)}</td>
                               <td className="px-8 py-6 text-right">
                                  <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${Number(pAvg) >= 4 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {pAvg}
                                  </span>
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
    teal: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30"
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 truncate">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-black ${colorMap[color] ? colorMap[color].split(' ')[0] : 'text-slate-600'}`}>{value}</span>
        {sub && <span className="text-slate-400 font-bold text-sm">{sub}</span>}
      </div>
    </div>
  );
};

const GlobalStat = ({ label, value, icon }: any) => (
   <div className="space-y-1">
      <div className="flex items-center gap-2 mb-1">
         <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg">{icon}</div>
         <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">{label}</p>
      </div>
      <p className="text-xl font-black text-slate-800 dark:text-slate-100 leading-none">{value}</p>
   </div>
);

const ChartCard = ({ title, children }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10 text-center">{title}</h3>
    <div className="w-full h-full">
        {children}
    </div>
  </div>
);

export default Stats;
