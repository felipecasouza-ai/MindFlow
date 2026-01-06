
import React, { useState, useEffect, useRef } from 'react';

interface PageSelectorProps {
  pdfData: string;
  fileName: string;
  onConfirm: (finalPdfData: string, totalPages: number) => void;
  onCancel: () => void;
}

const PageSelector: React.FC<PageSelectorProps> = ({ pdfData, fileName, onConfirm, onCancel }) => {
  const [pages, setPages] = useState<{ number: number; selected: boolean; thumb?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to convert Uint8Array to base64 safely for large files
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
          const viewport = page.getViewport({ scale: 0.3 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context!, viewport }).promise;
          initialPages.push({
            number: i,
            selected: true,
            thumb: canvas.toDataURL()
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
    setPages(prev => prev.map(p => p.number === num ? { ...p, selected: !p.selected } : p));
  };

  const handleDownloadFiltered = async () => {
    const selectedIndices = pages.filter(p => p.selected).map(p => p.number - 1);
    if (selectedIndices.length === 0) return alert("Selecione pelo menos uma página.");

    try {
      const { PDFDocument } = (window as any)['PDFLib'];
      const pdfBytes = Uint8Array.from(atob(pdfData.split(',')[1]), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdfDoc = await PDFDocument.create();
      
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, selectedIndices);
      copiedPages.forEach((page: any) => newPdfDoc.addPage(page));
      
      const newPdfBytes = await newPdfDoc.save();
      const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mindflow_edited_${fileName}`;
      link.click();
    } catch (error) {
      console.error("Error generating filtered PDF:", error);
      alert("Erro ao gerar o arquivo para download.");
    }
  };

  const handleConfirmPlan = async () => {
    const selectedIndices = pages.filter(p => p.selected).map(p => p.number - 1);
    if (selectedIndices.length === 0) return alert("Selecione pelo menos uma página.");
    
    setIsFinalizing(true);
    try {
      const { PDFDocument } = (window as any)['PDFLib'];
      const pdfBytes = Uint8Array.from(atob(pdfData.split(',')[1]), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const newPdfDoc = await PDFDocument.create();
      
      const copiedPages = await newPdfDoc.copyPages(pdfDoc, selectedIndices);
      copiedPages.forEach((page: any) => newPdfDoc.addPage(page));
      
      const newPdfBytes = await newPdfDoc.save();
      const base64 = uint8ToBase64(newPdfBytes);
      onConfirm(`data:application/pdf;base64,${base64}`, selectedIndices.length);
    } catch (error) {
      console.error("Error finalizing plan PDF:", error);
      alert("Erro ao processar o plano. Se o arquivo for muito grande, tente selecionar menos páginas.");
      setIsFinalizing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Analisando páginas do PDF...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-heading">Preparar Leitura</h2>
          <p className="text-slate-500 dark:text-slate-400">Selecione apenas as páginas que deseja incluir no seu plano.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={onCancel}
            className="flex-1 md:flex-none px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleDownloadFiltered}
            title="Baixar apenas as páginas selecionadas"
            className="flex-1 md:flex-none px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF Editado
          </button>
          <button 
            onClick={handleConfirmPlan}
            disabled={isFinalizing}
            className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isFinalizing ? 'Processando...' : 'Confirmar Plano'}
            {!isFinalizing && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5l10 -10"/></svg>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
        {pages.map((page) => (
          <div 
            key={page.number}
            onClick={() => togglePage(page.number)}
            className={`relative group cursor-pointer rounded-xl overflow-hidden border-4 transition-all ${
              page.selected 
                ? 'border-indigo-500 shadow-lg scale-100' 
                : 'border-slate-200 dark:border-slate-800 opacity-40 grayscale scale-95 hover:scale-[0.98]'
            }`}
          >
            <img src={page.thumb} alt={`Página ${page.number}`} className="w-full h-auto pointer-events-none" />
            
            <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Pág {page.number}
            </div>

            {page.selected ? (
              <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                <div className="bg-red-500/80 text-white p-2 rounded-full shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
              <span className="text-white text-[10px] font-bold uppercase tracking-tight">
                {page.selected ? 'Remover' : 'Incluir'}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-center">
        <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full text-slate-600 dark:text-slate-400 text-sm font-medium flex items-center gap-3">
          <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            {pages.filter(p => p.selected).length} selecionadas
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
          <span>Duração estimada: {Math.ceil(pages.filter(p => p.selected).length / 10)} dias</span>
        </div>
      </div>
    </div>
  );
};

export default PageSelector;
