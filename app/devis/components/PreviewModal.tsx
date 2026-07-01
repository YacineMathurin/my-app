"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, X, Printer, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PreviewModal({ data }: { data: unknown }) {
    const [isOpen, setIsOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [containerWidth, setContainerWidth] = useState(360);
    const objectUrlRef = useRef<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const cleanupUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/generate-pdf', { method: 'GET' });
                if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);

                const blob = await res.blob();
                if (cancelled) return;

                cleanupUrl();
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setPdfUrl(url);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Impossible de générer le document.');
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen, cleanupUrl]);

    const handleClose = () => {
        setIsOpen(false);
        setPdfUrl(null);
        setError(null);
        cleanupUrl();
    };

    const handlePrint = () => {
        if (!pdfUrl) return;
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.src = pdfUrl;
        document.body.appendChild(printFrame);
        printFrame.onload = () => {
            printFrame.contentWindow?.print();
        };
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium text-gray-700"
            >
                <FileText size={18} />
                Voir le détail du contrat
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
                    <div className="bg-white w-full h-full sm:h-[90vh] sm:max-w-3xl flex flex-col rounded-none sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* Header du Modal */}
                        <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-b bg-gray-50">
                            <div className="min-w-0">
                                <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">Aperçu de votre OT</h2>
                                <p className="text-xs text-gray-500">Document contractuel sécurisé</p>
                            </div>
                            <div className="flex gap-1.5 sm:gap-2 shrink-0">
                                <button
                                    onClick={handlePrint}
                                    disabled={!pdfUrl}
                                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Imprimer"
                                >
                                    <Printer size={20} />
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-200 rounded-lg"
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Zone du PDF */}
                        <div ref={containerRef} className="relative flex-1 w-full bg-gray-200 overflow-y-auto flex flex-col items-center py-4 px-2">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 px-4 text-center bg-gray-200">
                                    <Loader2 size={28} className="animate-spin" />
                                    <p className="text-sm">Génération du document…</p>
                                </div>
                            )}

                            {error && !isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-600 px-6 text-center bg-gray-200">
                                    <AlertTriangle size={28} />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {pdfUrl && !error && (
                                <Document
                                    file={pdfUrl}
                                    onLoadSuccess={({ numPages }) => {
                                        setNumPages(numPages);
                                        setIsLoading(false);
                                    }}
                                    onLoadError={(err) => {
                                        setError('Impossible d\'afficher le document.');
                                        setIsLoading(false);
                                        console.error(err);
                                    }}
                                    loading={null}
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        width={Math.min(containerWidth - 16, 700)}
                                        renderAnnotationLayer={false}
                                        className="shadow-md rounded overflow-hidden mb-2"
                                    />
                                </Document>
                            )}
                        </div>

                        {/* Navigation pages */}
                        {numPages > 1 && (
                            <div className="flex items-center justify-center gap-4 p-3 border-t bg-gray-50 text-sm text-gray-700">
                                <button
                                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                                    disabled={pageNumber <= 1}
                                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Page précédente"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span>Page {pageNumber} / {numPages}</span>
                                <button
                                    onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                                    disabled={pageNumber >= numPages}
                                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Page suivante"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}