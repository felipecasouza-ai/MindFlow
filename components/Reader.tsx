
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
  // Estados de UI (Devem ser instantâneos)
  const [displayPage, setDisplayPage] = useState(currentDay.startPage);
  const [displayZoom, setDisplayZoom] = useState(1.5);
  
  // Estados de Renderização (Controlam o Canvas)
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

  // Sincroniza estados de renderização com atraso para priorizar a UI
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderPageNum(displayPage);
      setRenderZoom(displayZoom);
    }, 50); // Delay suficiente para o tablet pintar o texto novo na tela
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
          const context = canvas.getContext('2d', { alpha: false }); // Alpha false otimiza performance
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            renderTaskRef.current = page.render({ canvasContext: context, viewport });
            await renderTaskRef.current.promise;
          }
        }

        // Extração de texto (apenas se for a página correta)
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

    // Usa requestAnimationFrame para garantir que o navegador teve chance de pintar a UI antes
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
        <p className="text-slate-400 font-medium">Otimizando PDF para Tablet...</p>
      </div>
    );
  }

  return (
    <div ref={readerContainerRef} className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans overflow-hidden">
      {/* Top Bar - Z-index alto para garantir visibilidade */}
      <div className="relative z-20 bg-slate-900/95 backdrop-blur-md px-4 py-2 flex justify-between items-center text-white border-b border-white/5 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg active:scale-90 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block leading-none">Dia {currentDay.dayNumber}</span>
            <h3 className="text-[11px] font-bold text-slate-400">Meta: {currentDay.startPage}-{currentDay.endPage}</h3>
          </div>
        </div>

        {/* Zoom - DisplayPage e DisplayZoom mudam INSTANTANEAMENTE agora */}
        <div className="flex items-center bg-slate-800/80 rounded-xl px-1 border border-white/10">
          <button onClick={handleZoomOut} className="p-2 text-slate-400 hover:text-white active:bg-white/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <span className="px-3 text-xs font-black min-w-[55px] text-center text-indigo-100">
            {Math.round(displayZoom * 100)}%
          </span>
          <button onClick={handleZoomIn} className="p-2 text-slate-400 hover:text-white active:bg-white/10 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-indigo-600/20 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs font-black text-indigo-200">
            Pág {displayPage} / {currentDay.endPage}
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

      {/* Viewport */}
      <div className="flex-grow overflow-auto bg-slate-950 p-2 sm:p-6 flex justify-center items-start custom-scrollbar touch-pan-x touch-pan-y">
        <div className="relative bg-white shadow-2xl transform-gpu transition-opacity duration-300" style={{ opacity: isRendering ? 0.7 : 1 }}>
          <canvas 
            ref={canvasRef} 
            className="block shadow-2xl" 
            style={{ willChange: 'transform' }}
          />
          {isRendering && (
            <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
              <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Renderizando...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="relative z-20 bg-slate-900/95 backdrop-blur-md p-3 border-t border-white/5 flex justify-center items-center gap-6">
        <button 
          onClick={handlePrev} 
          disabled={displayPage <= currentDay.startPage} 
          className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-10 rounded-2xl text-white transition-all active:scale-90 border border-white/5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1.5">
                {Array.from({ length: Math.min(currentDay.endPage - currentDay.startPage + 1, 15) }).map((_, i) => {
                    const p = currentDay.startPage + i;
                    return (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${p === displayPage ? 'bg-indigo-500 w-6' : p < displayPage ? 'bg-emerald-500/50 w-2' : 'bg-slate-800 w-2'}`} />
                    );
                })}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deslize para navegar</span>
        </div>

        <button 
          onClick={handleNext} 
          disabled={displayPage >= currentDay.endPage} 
          className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 disabled:opacity-10 rounded-2xl text-white transition-all active:scale-90 border border-white/5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      {/* Floating Time Badge */}
      <div className="fixed bottom-20 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black text-slate-400 z-30 pointer-events-none">
        {Math.floor(secondsSpent / 60)}m {secondsSpent % 60}s
      </div>

      {/* Master Progress */}
      <div className="h-1 bg-slate-800 w-full relative z-20">
        <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default Reader;
