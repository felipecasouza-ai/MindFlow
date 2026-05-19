
import React, { useState, useEffect } from 'react';
import { ReadingDay } from '../types';

interface PageSelectorProps {
  pdfData: string;
  fileName: string;
  onConfirm: (finalPdfData: string, totalPages: number, days: ReadingDay[]) => void;
  onCancel: () => void;
}

type Step = 'selection' | 'split-choice' | 'manual-marking';

const PageSelector: React.FC<PageSelectorProps> = ({ pdfData, fileName, onConfirm, onCancel }) => {
  const [pages, setPages] = useState<{ number: number; selected: boolean; thumb?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [step, setStep] = useState<Step>('selection');
  const [markers, setMarkers] = useState<number[]>([]); // Índices (0-based) das páginas selecionadas para manter
  
  // Custom states for options splitting
  const [partsCountState, setPartsCountState] = useState(10);
  const [pagesPerDayState, setPagesPerDayState] = useState(10);

  const selectedCount = pages.filter(p => p.selected).length;

  // Sync / clamp values on selectedCount change or user inputs
  useEffect(() => {
    if (selectedCount > 0) {
      setPartsCountState(prev => Math.min(Math.max(2, prev), selectedCount));
      setPagesPerDayState(prev => Math.min(Math.max(1, prev), selectedCount));
    }
  }, [selectedCount]);

  // Função robusta para converter Uint8Array em Base64 sem estourar a pilha
  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  useEffect(() => {
    const loadThumbs = async () => {
      try {
        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
        const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData.split(',')[1]) });
        const pdf = await loadingTask.promise;
        
        const pageCount = pdf.numPages;
        const initialPages = [];

        for (let i = 1; i <= pageCount; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport }).promise;
          initialPages.push({
            number: i,
            selected: true,
            thumb: canvas.toDataURL('image/jpeg', 0.8)
          });
        }
        setPages(initialPages);
        setIsProcessing(false);
      } catch (error) {
        console.error("Error loading PDF thumbs:", error);
        alert("Erro ao carregar prévia do PDF.");
        onCancel();
      }
    };

    loadThumbs();
  }, [pdfData]);

  const togglePage = (num: number) => {
    if (step !== 'selection') return;
    setPages(prev => prev.map(p => p.number === num ? { ...p, selected: !p.selected } : p));
  };

  const toggleMarker = (idx: number) => {
    if (step !== 'manual-marking') return;
    setMarkers(prev => 
      prev.includes(idx) ? prev.filter(m => m !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const processEditedPdf = async () => {
    try {
      const selectedIndices = pages.filter(p => p.selected).map(p => p.number - 1);
      if (selectedIndices.length === 0) {
        alert("Selecione pelo menos uma página.");
        return null;
      }

      const { PDFDocument } = (window as any)['PDFLib'];
      const pdfBytes = Uint8Array.from(atob(pdfData.split(',')[1]), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdfDoc = await PDFDocument.create();
      
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, selectedIndices);
      copiedPages.forEach((page: any) => newPdfDoc.addPage(page));
      
      return await newPdfDoc.save();
    } catch (e) {
      console.error("Erro interno no PDF-Lib:", e);
      throw e;
    }
  };

  const finalizeWithPagesPerDay = async (pSize: number) => {
    setIsFinalizing(true);
    try {
      const newPdfBytes = await processEditedPdf();
      if (!newPdfBytes) {
        setIsFinalizing(false);
        return;
      }
      
      const selectedCount = pages.filter(p => p.selected).length;
      const size = Math.max(1, pSize);
      const totalDays = Math.ceil(selectedCount / size);
      
      const finalDays: ReadingDay[] = Array.from({ length: totalDays }, (_, i) => ({
        dayNumber: i + 1,
        startPage: i * size + 1,
        endPage: Math.min((i + 1) * size, selectedCount),
        isCompleted: false
      }));

      const base64 = uint8ToBase64(newPdfBytes);
      onConfirm(`data:application/pdf;base64,${base64}`, selectedCount, finalDays);
    } catch (error) {
      console.error("Erro ao finalizar (Por Páginas/Dia):", error);
      alert("Erro ao processar o PDF. Verifique se o arquivo não está protegido.");
      setIsFinalizing(false);
    }
  };

  const finalizeWithEqualParts = async (pCount: number) => {
    setIsFinalizing(true);
    try {
      const newPdfBytes = await processEditedPdf();
      if (!newPdfBytes) {
        setIsFinalizing(false);
        return;
      }
      
      const selectedCount = pages.filter(p => p.selected).length;
      const count = Math.max(2, Math.min(pCount, selectedCount));
      
      let currentStart = 1;
      const finalDays: ReadingDay[] = [];
      const baseSize = Math.floor(selectedCount / count);
      const extra = selectedCount % count;

      for (let i = 0; i < count; i++) {
        const currentSize = baseSize + (i < extra ? 1 : 0);
        if (currentSize <= 0) continue;
        const endPage = currentStart + currentSize - 1;
        finalDays.push({
          dayNumber: finalDays.length + 1,
          startPage: currentStart,
          endPage: endPage,
          isCompleted: false
        });
        currentStart = endPage + 1;
      }

      const base64 = uint8ToBase64(newPdfBytes);
      onConfirm(`data:application/pdf;base64,${base64}`, selectedCount, finalDays);
    } catch (error) {
      console.error("Erro ao finalizar (Por Partes Iguais):", error);
      alert("Erro ao processar o PDF. Verifique se o arquivo não está protegido.");
      setIsFinalizing(false);
    }
  };

  const finalizeWithManualSplit = async () => {
    setIsFinalizing(true);
    try {
      const newPdfBytes = await processEditedPdf();
      if (!newPdfBytes) {
        setIsFinalizing(false);
        return;
      }
      
      const selectedPagesCount = pages.filter(p => p.selected).length;
      const finalDays: ReadingDay[] = [];
      let currentStart = 1;
      
      // Garantir que a última página seja um marcador se não houver marcadores ou se o último não for o fim
      const sortedMarkers = [...markers];
      if (!sortedMarkers.includes(selectedPagesCount - 1)) {
        sortedMarkers.push(selectedPagesCount - 1);
      }
      sortedMarkers.sort((a, b) => a - b);

      sortedMarkers.forEach((markerIdx, dayIdx) => {
        const endPage = markerIdx + 1;
        finalDays.push({
          dayNumber: dayIdx + 1,
          startPage: currentStart,
          endPage: endPage,
          isCompleted: false
        });
        currentStart = endPage + 1;
      });

      const base64 = uint8ToBase64(newPdfBytes);
      onConfirm(`data:application/pdf;base64,${base64}`, selectedPagesCount, finalDays);
    } catch (error) {
      console.error("Erro ao finalizar (Manual):", error);
      alert("Erro ao processar o PDF.");
      setIsFinalizing(false);
    }
  };

  const getGridColsClass = () => {
    switch(zoomLevel) {
      case 1: return "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10";
      case 2: return "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8";
      case 3: return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
      case 4: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
      default: return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
    }
  };

  const handlePartsCountChange = (val: number) => {
    setPartsCountState(Math.min(Math.max(2, val), selectedCount));
  };

  const handlePagesPerDayChange = (val: number) => {
    setPagesPerDayState(Math.min(Math.max(1, val), selectedCount));
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Analisando estrutura do livro...</p>
      </div>
    );
  }

  // Visualização de Escolha de Divisão
  if (step === 'split-choice') {
    const calculatedParts = Math.min(partsCountState, selectedCount);
    const avgPagesPerPart = Math.round(selectedCount / calculatedParts);
    const calculatedDaysByPageList = Math.ceil(selectedCount / pagesPerDayState);

    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] py-8 animate-in zoom-in duration-300">
        <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 max-w-6xl w-full text-center space-y-8">
          
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-slate-100 font-heading tracking-tight">Como deseja dividir sua leitura?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Você selecionou <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedCount} páginas</span> para o seu plano.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* CARD 1: PARTES IGUAIS */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-6 hover:shadow-lg dark:hover:shadow-indigo-950/15 hover:border-indigo-400 transition-all group">
              <div className="space-y-4 text-left">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-1">Partes Iguais</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Divida o livro exatamente no número de metas/partes que desejar.</p>
                </div>

                {/* Counter Input */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => handlePartsCountChange(partsCountState - 1)}
                      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-lg flex items-center justify-center select-none"
                    >
                      –
                    </button>
                    <span className="font-extrabold text-xl text-slate-800 dark:text-slate-100">{partsCountState}</span>
                    <button 
                      type="button"
                      onClick={() => handlePartsCountChange(partsCountState + 1)}
                      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-lg flex items-center justify-center select-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset quick pills */}
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[3, 5, 10, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePartsCountChange(preset)}
                        className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all ${
                          partsCountState === preset 
                          ? 'bg-indigo-500 text-white border-indigo-500' 
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset} partes
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                  Isso criará <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{calculatedParts} partes</span> de aproximadamente <span className="font-extrabold text-slate-700 dark:text-slate-350">{avgPagesPerPart} páginas</span> por meta.
                </p>
                <button 
                  onClick={() => finalizeWithEqualParts(partsCountState)}
                  disabled={isFinalizing}
                  className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-150 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isFinalizing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : `Dividir em ${partsCountState} Partes`}
                </button>
              </div>
            </div>

            {/* CARD 2: PÁGINAS POR DIA */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-6 hover:shadow-lg dark:hover:shadow-indigo-950/15 hover:border-indigo-400 transition-all group">
              <div className="space-y-4 text-left">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-1">Páginas por Dia</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Excelente para ler em blocos com metas fixas de páginas diárias.</p>
                </div>

                {/* Counter Input */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => handlePagesPerDayChange(pagesPerDayState - 1)}
                      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-lg flex items-center justify-center select-none"
                    >
                      –
                    </button>
                    <span className="font-extrabold text-xl text-slate-800 dark:text-slate-100">{pagesPerDayState}</span>
                    <button 
                      type="button"
                      onClick={() => handlePagesPerDayChange(pagesPerDayState + 1)}
                      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all text-lg flex items-center justify-center select-none"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset quick pills */}
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[5, 10, 15, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePagesPerDayChange(preset)}
                        className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all ${
                          pagesPerDayState === preset 
                          ? 'bg-indigo-500 text-white border-indigo-500' 
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset} págs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                  Isso criará <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{calculatedDaysByPageList} dias</span> de estudo lendo <span className="font-extrabold text-slate-700 dark:text-slate-350">{pagesPerDayState} páginas</span> por dia.
                </p>
                <button 
                  onClick={() => finalizeWithPagesPerDay(pagesPerDayState)}
                  disabled={isFinalizing}
                  className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-150 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                >
                  {isFinalizing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : `Meta de ${pagesPerDayState} Págs/Dia`}
                </button>
              </div>
            </div>

            {/* CARD 3: ESCOLHER CAPÍTULOS MANUALMENTE */}
            <div className="bg-slate-50/50 dark:bg-slate-950/30 p-8 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 flex flex-col justify-between space-y-6 hover:shadow-lg dark:hover:shadow-indigo-950/15 hover:border-indigo-400 transition-all group">
              <div className="space-y-4 text-left">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-1">Escolher Capítulos</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total liberdade para escolher e definir onde cada dia ou capítulo se encerra.</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-10 border-slate-200 dark:border-slate-700 shadow-inner">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                    Você folheia a prévia visual das páginas e marca à mão o exato final do Dia 1, Dia 2, etc. Recomendado para livros técnicos com divisões de capítulos variadas.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center">
                  Divida o plano conforme a estrutura nativa de capítulos do seu livro.
                </p>
                <button 
                  onClick={() => setStep('manual-marking')}
                  className="w-full py-4 px-6 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-extrabold rounded-2xl hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 select-none"
                >
                  Ir para Marcação Visual
                </button>
              </div>
            </div>

          </div>

          <button onClick={() => setStep('selection')} className="mt-8 text-sm font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 mx-auto select-none">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
             Voltar para refinamento de páginas
          </button>
        </div>
      </div>
    );
  }

  const selectedPagesOnly = pages.filter(p => p.selected);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-heading">
            {step === 'selection' ? 'Refinar Conteúdo' : 'Definir Divisões Diárias'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {step === 'selection' 
              ? 'Mantenha selecionado apenas o que você deseja ler.' 
              : 'Selecione a página onde termina o dia de leitura.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Controles de Zoom visíveis em ambos os passos de thumbnail */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mr-2 border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-90"
              title="Diminuir visualização"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <div className="px-2 text-[10px] font-black uppercase text-slate-400 min-w-[40px] text-center select-none">Lupa</div>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(4, prev + 1))}
              className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-90"
              title="Aumentar visualização"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          <button onClick={onCancel} className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm">
            Cancelar
          </button>
          
          {step === 'selection' ? (
            <button 
              onClick={() => setStep('split-choice')}
              className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
            >
              Confirmar Páginas
            </button>
          ) : (
            <button 
              onClick={finalizeWithManualSplit}
              disabled={isFinalizing}
              className="flex-1 md:flex-none px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none text-sm flex items-center justify-center gap-2"
            >
              {isFinalizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processando...
                </>
              ) : 'Criar Plano Manual'}
            </button>
          )}
        </div>
      </div>

      <div className={`grid ${getGridColsClass()} gap-4 sm:gap-6 max-h-[60vh] overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all duration-300`}>
        {(step === 'selection' ? pages : selectedPagesOnly).map((page, idx) => {
          const isMarker = markers.includes(idx);
          const dayNumber = markers.filter(m => m < idx).length + 1;

          return (
            <div 
              key={page.number}
              onClick={() => step === 'selection' ? togglePage(page.number) : toggleMarker(idx)}
              className={`relative group cursor-pointer rounded-xl overflow-hidden border-4 transition-all duration-300 ${
                step === 'selection' 
                  ? (page.selected ? 'border-indigo-500 shadow-lg' : 'border-slate-200 dark:border-slate-800 opacity-40 grayscale scale-95 hover:opacity-70')
                  : (isMarker ? 'border-emerald-500 shadow-xl scale-105 z-10' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300')
              }`}
            >
              <img src={page.thumb} alt={`Pág ${page.number}`} className="w-full h-auto select-none pointer-events-none" />
              
              <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                {page.number}
              </div>

              {step === 'selection' && page.selected && (
                <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}

              {step === 'manual-marking' && (
                <>
                  <div className={`absolute inset-x-0 bottom-0 py-1.5 px-2 text-[9px] font-black uppercase text-center transition-all ${isMarker ? 'bg-emerald-500 text-white' : 'bg-slate-900/60 text-slate-300 opacity-0 group-hover:opacity-100'}`}>
                    {isMarker ? `Fim do Dia ${dayNumber}` : 'Marcar Fim de Dia'}
                  </div>
                  {isMarker && (
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none"></div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-8 flex justify-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-6 py-3 rounded-2xl text-slate-600 dark:text-slate-400 text-sm font-medium shadow-sm flex items-center gap-4">
          {step === 'selection' ? (
            <>
              Total selecionado: <span className="font-bold text-indigo-600 dark:text-indigo-400">{pages.filter(p => p.selected).length} páginas</span>
            </>
          ) : (
            <>
              Seu plano terá: <span className="font-bold text-emerald-600 dark:text-emerald-400">{markers.length + (markers.includes(selectedPagesOnly.length - 1) ? 0 : 1)} dias</span> de leitura personalizada.
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageSelector;
