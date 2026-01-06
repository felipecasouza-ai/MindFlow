
import React, { useState } from 'react';
import { StudyMaterials, MindMapNode } from '../types';

interface StudyReviewProps {
  materials: StudyMaterials | null;
  onFinish: () => void;
}

const MindMapRenderer: React.FC<{ node: MindMapNode; depth?: number }> = ({ node, depth = 0 }) => {
  return (
    <div className={`flex flex-col items-center ${depth === 0 ? 'w-full' : ''}`}>
      <div className={`
        px-4 py-2 rounded-xl border-2 mb-4 text-center transition-all
        ${depth === 0 ? 'bg-indigo-600 text-white border-indigo-400 font-bold text-lg shadow-lg' : 
          depth === 1 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold' :
          'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700 text-sm'}
      `}>
        {node.label}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="flex flex-wrap justify-center gap-4 relative">
          <div className="absolute top-[-1rem] left-1/2 w-px h-4 bg-indigo-200 dark:bg-indigo-800" />
          {node.children.map((child, i) => (
            <MindMapRenderer key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const StudyReview: React.FC<StudyReviewProps> = ({ materials, onFinish }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'mindmap' | 'infographic'>('summary');

  if (!materials) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">Sincronizando materiais de estudo...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold font-heading text-slate-800 dark:text-slate-100">Consolidação de Conhecimento</h2>
        <p className="text-slate-500 dark:text-slate-400">Excelente leitura! Aqui está sua revisão personalizada gerada pela IA.</p>
      </div>

      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
        {(['summary', 'mindmap', 'infographic'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${
              activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'summary' ? 'Resumo' : tab === 'mindmap' ? 'Mapa Mental' : 'Infográfico'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 text-indigo-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <h3 className="text-xl font-bold">Resumo do Dia</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg first-letter:text-5xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-indigo-600">
              {materials.summary}
            </p>
            <div className="flex justify-end pt-4">
              <span className="text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                {materials.summary.split(' ').length} palavras
              </span>
            </div>
          </div>
        )}

        {activeTab === 'mindmap' && (
          <div className="overflow-x-auto p-4 animate-in zoom-in duration-500">
            <MindMapRenderer node={materials.mindMap} />
          </div>
        )}

        {activeTab === 'infographic' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-500">
            {materials.infographic.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 group hover:border-indigo-500 transition-colors">
                <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{item.icon}</div>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{item.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onFinish}
        className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold py-5 rounded-2xl shadow-xl transition-all hover:scale-[1.01]"
      >
        Concluir Revisão e Finalizar Dia
      </button>
    </div>
  );
};

export default StudyReview;
