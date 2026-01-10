
import React, { useState, useEffect } from 'react';
import { ReadingDay } from '../types';

interface PageSelectorProps {
  pdfData: string;
  fileName: string;
  onConfirm: (finalPdfData: string, totalPages: number, days: ReadingDay[]) => void;
  onCancel: () => void;
}

const PageSelector: React.FC<PageSelectorProps> = ({ pdfData, fileName, onConfirm, onCancel }) => {
  const [pages, setPages] = useState<{ number: number; selected: boolean; thumb?: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const uint8ToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const triggerDownload = (bytes: Uint8Array, name: string) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name.toLowerCase().endsWith('.pdf') ? name : `${name}_editado.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const processEditedPdf = async () => {
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
  };

  const handleDownloadOnly = async () => {
    setIsFinalizing(true);
    try {
      const bytes = await processEditedPdf();
      if (bytes) triggerDownload(bytes, fileName);
    } catch (error) {
      alert("Erro ao gerar download.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleConfirmPlan = async () => {
    const selectedPageNumbers = pages.filter(p => p.selected).map(p => p.number);
    if (selectedPageNumbers.length === 0) return alert("Selecione pelo menos uma página.");
    
    setIsFinalizing(true);
    try {
      const newPdfBytes = await processEditedPdf();
      if (!newPdfBytes) throw new Error("Falha ao processar páginas");
      
      const base64 = uint8ToBase64(newPdfBytes);
      const newTotalPages = selectedPageNumbers.length;
      const totalDays = Math.ceil(newTotalPages / 10);
      
      const finalDays: ReadingDay[] = Array.from({ length: totalDays }, (_, i) => ({
        dayNumber: i + 1,
        startPage: i * 10 + 1,
        endPage: Math.min((i + 1) * 10, newTotalPages),
        isCompleted: false
      }));

      onConfirm(`data:application/pdf;base64,${base64}`, newTotalPages, finalDays);
    } catch (error) {
      console.error("Error finalizing:", error);
      alert("Erro ao processar o PDF.");
      setIsFinalizing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Extraindo páginas do livro...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 mb-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-heading">Refinar Livro</h2>
          <p className="text-slate-500 dark:text-slate-400">Remova páginas desnecessárias (capas, índices, bibliografias).</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button onClick={onCancel} className="px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm">
            Cancelar
          </button>
          
          <button 
            onClick={handleDownloadOnly}
            disabled={isFinalizing}
            className="px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Baixar PDF
          </button>

          <button 
            onClick={handleConfirmPlan}
            disabled={isFinalizing}
            className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {isFinalizing ? 'Processando...' : 'Criar Plano'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800">
        {pages.map((page) => (
          <div 
            key={page.number}
            onClick={() => togglePage(page.number)}
            className={`relative group cursor-pointer rounded-xl overflow-hidden border-4 transition-all ${
              page.selected 
                ? 'border-indigo-500 shadow-lg scale-100' 
                : 'border-slate-200 dark:border-slate-800 opacity-40 grayscale scale-95'
            }`}
          >
            <img src={page.thumb} alt={`Pág ${page.number}`} className="w-full h-auto" />
            <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              Pág {page.number}
            </div>
            {page.selected && (
              <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}
            <div className={`absolute inset-0 bg-indigo-600/10 transition-opacity ${page.selected ? 'opacity-100' : 'opacity-0'}`}></div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex justify-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-6 py-3 rounded-2xl text-slate-600 dark:text-slate-400 text-sm font-medium shadow-sm">
          Resumo do plano: <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {pages.filter(p => p.selected).length} páginas
          </span> (Aprox. {Math.ceil(pages.filter(p => p.selected).length / 10)} dias de leitura).
        </div>
      </div>
    </div>
  );
};

export default PageSelector;
