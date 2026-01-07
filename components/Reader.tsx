
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
  const [currentPage, setCurrentPage] = useState(currentDay.startPage);
  const [zoomScale, setZoomScale] = useState(1.5);
  const [isRendering, setIsRendering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [secondsSpent, setSecondsSpent] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const textContentRef = useRef<string>("");
  const readerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async (pageNumber: number, scale: number) => {
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch (e) {}
      }

      setIsRendering(true);
      try {
        const pdfjs = (window as any)['pdfjs-dist/build/pdf'];
        
        // Decodifica base64 para Uint8Array de forma mais eficiente
        const binaryString = atob(pdfData.split(',')[1]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjs.getDocument({ 
          data: bytes,
          cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDF_JS_VERSION}/cmaps/`,
          cMapPacked: true,
        });
        
        const pdf = await loadingTask.promise;

        if (isCancelled) return;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: scale });

        const canvas = canvasRef.current;
        if (canvas && !isCancelled) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            renderTaskRef.current = page.render(renderContext);
            await renderTaskRef.current.promise;
          }
        }

        if (!isCancelled && pageNumber === currentPage) {
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          
          if (pageNumber === currentDay.startPage) {
            textContentRef.current = pageText;
          } else if (!textContentRef.current.includes(pageText.substring(0, 30))) {
            textContentRef.current += " " + pageText;
          }
        }
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error("Erro ao renderizar página:", error);
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    renderPage(currentPage, zoomScale);

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [currentPage, zoomScale, pdfData, currentDay.startPage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleNext = () => {
    if (currentPage < currentDay.endPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > currentDay.startPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoomScale(1.5);

  const isAtLastPageOfGoal = currentPage === currentDay.endPage;
  const progressInGoal = ((currentPage - currentDay.startPage + 1) / (currentDay.endPage - currentDay.startPage + 1)) * 100;

  return (
    <div ref={readerContainerRef} className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans">
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2 flex justify-between items-center text-white border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="h-4 w-px bg-white/10 mx-1"></div>
          <div>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block leading-none mb-1">Dia {currentDay.dayNumber}</span>
            <h3 className="text-xs font-medium text-slate-400 hidden sm:block">Meta: Pág {currentDay.startPage} - {currentDay.endPage}</h3>
          </div>
        </div>

        <div className="flex items-center bg-slate-800/50 rounded-lg px-1 border border-white/5">
          <button onClick={handleZoomOut} disabled={zoomScale <= 0.5} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button onClick={resetZoom} className="px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white min-w-[50px]">
            {Math.round(zoomScale * 100)}%
          </button>
          <button onClick={handleZoomIn} disabled={zoomScale >= 4.0} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
            )}
          </button>
          
          <div className="bg-slate-800 px-3 py-1 rounded-full border border-white/5 text-[11px] font-bold text-slate-200">
            {currentPage} / {currentDay.endPage}
          </div>

          {isAtLastPageOfGoal && (
            <button 
              onClick={() => onDayComplete(textContentRef.current, secondsSpent)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-1.5 px-3 rounded-lg transition-all animate-pulse uppercase"
            >
              Fazer Quiz
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow overflow-auto bg-slate-950 p-2 sm:p-4 flex justify-center items-start custom-scrollbar">
        <div className="relative bg-white shadow-2xl rounded-sm overflow-hidden transform-gpu max-w-none">
          {isRendering && (
            <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center z-10 backdrop-blur-[1px]">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <canvas ref={canvasRef} className="block shadow-xl" />
        </div>
      </div>

      <div className="bg-slate-900/95 backdrop-blur-md p-2 border-t border-white/5 flex justify-center items-center gap-4">
        <button onClick={handlePrev} disabled={currentPage <= currentDay.startPage || isRendering} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-10 rounded-lg text-white transition-all active:scale-90">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div className="flex gap-1">
          {Array.from({ length: Math.min(currentDay.endPage - currentDay.startPage + 1, 10) }).map((_, i) => {
            const pageNum = currentDay.startPage + i;
            const isCurrent = pageNum === currentPage;
            const isRead = pageNum < currentPage;
            return (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-300 ${
                  isCurrent ? 'bg-indigo-500 w-4' : isRead ? 'bg-emerald-500/40' : 'bg-slate-800'
                }`}
                style={{ width: isCurrent ? '1.5rem' : '0.5rem' }}
              />
            );
          })}
        </div>

        <button onClick={handleNext} disabled={currentPage >= currentDay.endPage || isRendering} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-10 rounded-lg text-white transition-all active:scale-90">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      <div className="h-0.5 bg-slate-800 w-full">
        <div 
          className="h-full bg-indigo-500 transition-all duration-500" 
          style={{ width: `${progressInGoal}%` }}
        />
      </div>
    </div>
  );
};

export default Reader;
