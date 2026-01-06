
import React from 'react';
import { ReadingPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

interface StatsProps {
  plan: ReadingPlan;
}

const Stats: React.FC<StatsProps> = ({ plan }) => {
  const completedDays = plan.days.filter(d => d.isCompleted);
  
  // Média de pontuação dos quizzes
  const averageScore = completedDays.length > 0 
    ? (completedDays.reduce((acc, d) => acc + (d.quizScore || 0), 0) / completedDays.length).toFixed(1)
    : 0;

  // Cálculos de Tempo
  const totalTimeSeconds = completedDays.reduce((acc, d) => acc + (d.timeSpentSeconds || 0), 0);
  const totalPagesRead = completedDays.reduce((acc, d) => acc + (d.endPage - d.startPage + 1), 0);
  
  const averageTimePerDaySeconds = completedDays.length > 0 ? totalTimeSeconds / completedDays.length : 0;
  const averageTimePerPageSeconds = totalPagesRead > 0 ? totalTimeSeconds / totalPagesRead : 0;

  // Projeção
  const remainingPages = plan.totalPages - totalPagesRead;
  const estimatedRemainingTimeSeconds = remainingPages * averageTimePerPageSeconds;
  const estimatedRemainingDays = Math.ceil(remainingPages / 10); // Baseado na meta de 10 pág/dia

  const formatSeconds = (secs: number) => {
    if (secs === 0) return "--";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const chartData = plan.days.map(d => ({
    name: `Dia ${d.dayNumber}`,
    score: d.quizScore || 0,
    tempo: Math.round((d.timeSpentSeconds || 0) / 60 * 10) / 10, // min
    status: d.isCompleted ? 'Concluído' : 'Pendente'
  })).slice(0, Math.max(plan.currentDayIndex + 5, 10));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Resumo de Projeção */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-xl font-bold mb-2 font-heading">Projeção de Término</h3>
            <p className="opacity-90 leading-relaxed max-w-md">
              {completedDays.length > 0 ? (
                <>Com base no seu ritmo atual de <span className="font-bold">{formatSeconds(averageTimePerPageSeconds)} por página</span>, 
                estimamos o seguinte para concluir este livro:</>
              ) : (
                <>Complete sua primeira meta de leitura para que possamos projetar seu tempo de conclusão!</>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Tempo Restante</p>
              <p className="text-2xl font-black">{completedDays.length > 0 ? formatSeconds(estimatedRemainingTimeSeconds) : "--"}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Dias Faltantes</p>
              <p className="text-2xl font-black">{completedDays.length > 0 ? estimatedRemainingDays : "--"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase mb-2">Páginas Lidas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{totalPagesRead}</span>
            <span className="text-slate-400 dark:text-slate-600 font-bold text-sm">/ {plan.totalPages}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase mb-2">Média Tempo/Dia</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {formatSeconds(averageTimePerDaySeconds)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase mb-2">Ritmo Médio/Pág</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
              {formatSeconds(averageTimePerPageSeconds)}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase mb-2">Score de Quiz</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{averageScore}</span>
            <span className="text-slate-400 dark:text-slate-600 font-bold text-xs">/ 5.0</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico de Notas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 font-heading">Performance nos Quizzes</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 2.5 ? '#6366f1' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Tempo */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 font-heading">Tempo Investido (Minutos)</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: '#1e293b', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="tempo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-sm tracking-widest">Resumo das Sessões</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/30 dark:bg-slate-800/30">
                <th className="px-6 py-4">Dia</th>
                <th className="px-6 py-4">Páginas</th>
                <th className="px-6 py-4">Duração</th>
                <th className="px-6 py-4">Velocidade</th>
                <th className="px-6 py-4 text-right">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {completedDays.map((day) => {
                const pagesInDay = day.endPage - day.startPage + 1;
                const timePerPage = (day.timeSpentSeconds || 0) / pagesInDay;
                return (
                  <tr key={day.dayNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">Dia {day.dayNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{day.startPage} a {day.endPage}</td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-slate-600 dark:text-slate-300">{formatSeconds(day.timeSpentSeconds || 0)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{formatSeconds(timePerPage)} / pág</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                        (day.quizScore || 0) >= 4 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        (day.quizScore || 0) >= 2.5 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      }`}>
                        {day.quizScore}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Stats;
