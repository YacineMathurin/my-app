"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, X, Printer, Loader2, AlertTriangle, Download } from 'lucide-react';

export default function PreviewModal({ }: { data: unknown }) {
    const [isOpen, setIsOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [embedFailed, setEmbedFailed] = useState(false);
    const objectUrlRef = useRef<string | null>(null);

    const cleanupUrl = useCallback(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, []);

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
                }
            } finally {
                if (!cancelled) setIsLoading(false);
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
        setEmbedFailed(false);
        setIsLoading(false);
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
                    <div className="bg-white w-full h-full sm:h-[90vh] sm:max-w-3xl flex flex-col rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">

                        {/* Header du Modal */}
                        <div className="flex justify-between items-center gap-3 p-4 sm:p-6 border-b bg-gray-50 shrink-0">
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
                        <div className="relative flex-1 min-h-0 w-full bg-gray-200">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500 px-4 text-center bg-gray-200 z-10">
                                    <Loader2 size={28} className="animate-spin" />
                                    <p className="text-sm">Génération du document…</p>
                                </div>
                            )}

                            {error && !isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-600 px-6 text-center bg-gray-200 z-10">
                                    <AlertTriangle size={28} />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}

                            {pdfUrl && !isLoading && !error && !embedFailed && (
                                <embed
                                    src={pdfUrl}
                                    type="application/pdf"
                                    className="w-full h-full"
                                    onError={() => setEmbedFailed(true)}
                                />
                            )}

                            {pdfUrl && !isLoading && !error && embedFailed && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center bg-gray-200">
                                    <FileText size={32} className="text-gray-400" />
                                    <p className="text-sm text-gray-600">L&apos;aperçu n&apos;est pas disponible sur ce navigateur.</p>

                                    <a
                                        href={pdfUrl}
                                        download="contrat.pdf"
                                        className="flex items-center gap-2 py-2.5 px-5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition font-medium text-sm"
                                    >
                                        <Download size={16} />
                                        Télécharger le document
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div >
            )
            }
        </>
    );
}