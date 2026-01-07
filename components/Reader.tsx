
import React, { useState, useEffect, useRef } from 'react';
import { ReadingDay } from '../types';

const PDF_JS_VERSION = '3.11.174';

interface ReaderProps {
  pdfData: string;
  currentDay: ReadingDay;
  onDayComplete: (text: string, timeSpent: number) => void;
  onClose: () => void;
}

const Reader: React.FC<ReaderProps> = ({ pdfData, currentDay, onDayComplete, onClose }) => {
  // Estados de UI (Devem ser instantâneos para o usuário ver o número mudar)
  const [displayPage, setDisplayPage] = useState(currentDay.startPage);
  const [displayZoom, setDisplayZoom] = useState(1.5);
  
  // Estados de Renderização (Estes disparam o processamento pesado do PDF.js)
  const [renderPageNum, setRenderPageNum] = useState(currentDay.startPage);
  const [renderZoom, setRenderZoom] = useState(1.5);

  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isDocLoading, setIsDocLoading] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const textContentRef = useRef<string>("");
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Timer de estudo
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * SINCRONIZAÇÃO DE UI vs RENDERIZAÇÃO
   * Em tablets, o Chrome prioriza a tarefa JS mais pesada. 
   * Aumentamos o delay para 150ms para garantir que o navegador termine 
   * o "Layout/Paint" do texto (número da página/zoom) antes de travar a CPU com o PDF.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderPageNum(displayPage);
      setRenderZoom(displayZoom);
    }, 150); 
    return () => clearTimeout(timer);
  }, [displayPage, displayZoom]);

  // Carregamento Único do Documento
  useEffect(() => {
    let isMounted = true;
    const loadDocument = async () => {
      setIsDocLoading(true);
      try {
        const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
        const binaryString = atob(pdfData.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        const loadingTask = pdfjs.getDocument({ 
          data: bytes,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/cmaps/`,
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;
        if (isMounted) {
          pdfDocRef.current = pdf;
          setIsDocLoading(false);
        }
      } catch (error) {
        console.error("Erro no PDF:", error);
        if (isMounted) setIsDocLoading(false);
      }
    };
    loadDocument();
    return () => { isMounted = false; };
  }, [pdfData]);

  // Renderização Real no Canvas
  useEffect(() => {
    if (!pdfDocRef.current || isDocLoading) return;

    let isCancelled = false;

    const render = async () => {
      if (renderTaskRef.current) {
        try { await renderTaskRef.current.cancel(); } catch (e) {}
      }

      setIsRendering(true);
      try {
        const page = await pdfDocRef.current.getPage(renderPageNum);
        const viewport = page.getViewport({ scale: renderZoom });
        const canvas = canvasRef.current;

        if (canvas && !isCancelled) {
          const context = canvas.getContext('2d', { alpha: false });
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            renderTaskRef.current = page.render({ canvasContext: context, viewport });
            await renderTaskRef.current.promise;
          }
        }

        // Extração de texto para o Quiz
        if (!isCancelled && renderPageNum === displayPage) {
          const text = await page.getTextContent();
          const pageStr = text.items.map((item: any) => item.str).join(" ");
          if (renderPageNum === currentDay.startPage) {
            textContentRef.current = pageStr;
          } else if (!textContentRef.current.includes(pageStr.substring(0, 30))) {
            textContentRef.current += " " + pageStr;
          }
        }
      } catch (e: any) {
        if (e.name !== 'RenderingCancelledException') console.error(e);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    // Usar rAF garante que o browser teve um frame de respiro após a mudança de estado
    const frameId = requestAnimationFrame(() => {
      render();
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [renderPageNum, renderZoom, isDocLoading]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleNext = () => displayPage < currentDay.endPage && setDisplayPage(p => p + 1);
  const handlePrev = () => displayPage > currentDay.startPage && setDisplayPage(p => p - 1);
  const handleZoomIn = () => setDisplayZoom(z => Math.min(z + 0.25, 4.0));
  const handleZoomOut = () => setDisplayZoom(z => Math.max(z - 0.25, 0.5));

  const progress = ((displayPage - currentDay.startPage + 1) / (currentDay.endPage - currentDay.startPage + 1)) * 100;

  if (isDocLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium tracking-tight">Otimizando exibição para Tablet...</p>
      </div>
    );
  }

  return (
    <div ref={readerContainerRef} className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Bar - Z-index alto para garantir visibilidade */}
      <div className="relative z-50 bg-slate-900/95 backdrop-blur-md px-4 py-2 flex justify-between items-center text-white border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="hidden sm:block">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block leading-none">Dia {currentDay.dayNumber}</span>
            <h3 className="text-[10px] font-bold text-slate-400">Meta: {currentDay.startPage}-{currentDay.endPage}</h3>
          </div>
        </div>

        {/* CONTROLES DE ZOOM - Mostram displayZoom instantaneamente */}
        <div className="flex items-center bg-slate-800/80 rounded-xl px-1 border border-white/10">
          <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white active:bg-white/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span className="px-3 text-xs font-black min-w-[60px] text-center text-white tabular-nums">
            {Math.round(displayZoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white active:bg-white/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* NÚMERO DA PÁGINA - Mostra displayPage instantaneamente */}
          <div className="bg-indigo-600 border border-indigo-400/30 px-3 py-1.5 rounded-lg text-xs font-black text-white shadow-inner tabular-nums">
            {displayPage} / {currentDay.endPage}
          </div>

          {displayPage === currentDay.endPage && (
            <button 
              onClick={() => onDayComplete(textContentRef.current, secondsSpent)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-2 px-4 rounded-lg animate-pulse uppercase shadow-lg shadow-emerald-900/20"
            >
              Quiz
            </button>
          )}
        </div>
      </div>

      {/* Viewport Principal */}
      <div className="flex-grow overflow-auto bg-slate-950 p-2 sm:p-6 flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y">
        <div className="relative bg-white shadow-2xl transform-gpu transition-opacity duration-300" style={{ opacity: isRendering ? 0.6 : 1 }}>
          <canvas 
            ref={canvasRef} 
            className="block shadow-2xl" 
            style={{ willChange: 'transform' }}
          />
          {isRendering && (
            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-xl px-4 py-2 rounded-xl flex items-center gap-3 border border-white/20 shadow-2xl z-40">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Carregando Meta...</span>
            </div>
          )}
        </div>
      </div>

      {/* Navegação Inferior */}
      <div className="relative z-50 bg-slate-900/95 backdrop-blur-md p-4 border-t border-white/5 flex justify-center items-center gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button 
          onClick={handlePrev} 
          disabled={displayPage <= currentDay.startPage} 
          className="w-14 h-14 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-5 rounded-2xl text-white transition-all active:scale-90 border border-white/5 shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
                {Array.from({ length: Math.min(currentDay.endPage - currentDay.startPage + 1, 15) }).map((_, i) => {
                    const p = currentDay.startPage + i;
                    return (
                        <div 
                          key={i} 
                          className={`h-2 rounded-full transition-all duration-700 ${
                            p === displayPage ? 'bg-indigo-500 w-8 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 
                            p < displayPage ? 'bg-emerald-500/50 w-2.5' : 
                            'bg-slate-800 w-2.5'
                          }`} 
                        />
                    );
                })}
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-80">Progresso da Sessão</span>
        </div>

        <button 
          onClick={handleNext} 
          disabled={displayPage >= currentDay.endPage} 
          className="w-14 h-14 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-5 rounded-2xl text-white transition-all active:scale-90 border border-white/5 shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* CONTADOR DE TEMPO - Escondido no tablet (md/lg) por pedido do usuário */}
      <div className="hidden xl:block fixed bottom-24 right-6 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-black text-slate-300 z-50 pointer-events-none shadow-2xl">
        {Math.floor(secondsSpent / 60)}m {String(secondsSpent % 60).padStart(2, '0')}s
      </div>

      {/* Barra de Progresso Master */}
      <div className="h-1.5 bg-slate-800 w-full relative z-50">
        <div 
          className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-emerald-500 transition-all duration-700 shadow-[0_0_15px_rgba(99,102,241,0.6)]" 
          style={{ width: `${progress}%` }} 
        />
      </div>
    </div>
  );
};

export default Reader;
