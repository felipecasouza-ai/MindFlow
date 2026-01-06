
import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizProps {
  questions: QuizQuestion[] | null;
  isLoading: boolean;
  onFinish: (score: number) => void;
  onCancel: () => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, isLoading, onFinish, onCancel }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800">Gerando seu quiz personalizado...</h2>
          <p className="text-slate-500 max-w-md">O Gemini AI está analisando o conteúdo que você acabou de ler para criar 5 perguntas exclusivas.</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) return null;

  const currentQ = questions[currentIdx];

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQ.correctAnswer) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    return (
      <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center max-w-xl mx-auto space-y-8 animate-in zoom-in duration-300">
        <div className="text-6xl mb-4">
          {correctCount >= 3 ? '🎉' : '📚'}
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Finalizado!</h2>
          <p className="text-slate-500 text-lg">Seu desempenho hoje:</p>
        </div>
        
        <div className="bg-slate-50 py-8 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="text-6xl font-black text-indigo-600">{correctCount}</span>
          <span className="text-3xl text-slate-400 font-bold"> / {questions.length}</span>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onFinish(correctCount)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
          >
            Concluir o Dia
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center px-2">
        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Questão {currentIdx + 1} de {questions.length}</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Sair do Quiz</button>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 min-h-[400px] flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">
            {currentQ.question}
          </h2>

          <div className="space-y-4">
            {currentQ.options.map((option, idx) => {
              let btnClass = "w-full p-4 rounded-2xl border-2 text-left transition-all font-medium flex items-center justify-between group ";
              
              if (!isAnswered) {
                btnClass += "border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 text-slate-700";
              } else {
                if (idx === currentQ.correctAnswer) {
                  btnClass += "border-emerald-500 bg-emerald-50 text-emerald-800";
                } else if (idx === selectedOption) {
                  btnClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  btnClass += "border-slate-100 text-slate-400 opacity-60";
                }
              }

              return (
                <button 
                  key={idx} 
                  onClick={() => handleAnswer(idx)}
                  className={btnClass}
                  disabled={isAnswered}
                >
                  <span>{option}</span>
                  {isAnswered && idx === currentQ.correctAnswer && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctAnswer && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isAnswered && (
          <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4">
            <div className="mb-6 p-4 bg-indigo-50 rounded-xl text-indigo-800 text-sm leading-relaxed">
              <span className="font-bold block mb-1">Explicação:</span>
              {currentQ.explanation}
            </div>
            <button 
              onClick={nextQuestion}
              className="w-full bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:bg-slate-800 shadow-xl"
            >
              {currentIdx < questions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultados'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quiz;
