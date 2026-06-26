"use client";
import { useState } from 'react';
import { FileText, X, Printer } from 'lucide-react';

export default function PreviewModal({ data }: { data: unknown }) {
    const [isOpen, setIsOpen] = useState(false);

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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                        {/* Header du Modal */}
                        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Aperçu de votre OT</h2>
                                <p className="text-xs text-gray-500">Document contractuel sécurisé</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-gray-200 rounded-lg"><Printer size={20} /></button>
                                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 rounded-lg"><X size={20} /></button>
                            </div>
                        </div>

                        {/* Zone du "Papier" */}
                        {/* <iframe
                            src={`https://google.com`}
                            className="flex-1 w-full"
                            title="Aperçu du contrat"
                        ></iframe> */}

                        {/* Zone du PDF */}
                        <div className="flex-1 w-full h-full bg-gray-200">
                            <iframe
                                src={`/api/generate-pdf`}
                                className="w-full h-full border-0"
                                title="Aperçu PDF"
                                loading="lazy"
                                // Optionnel : permet d'éviter que le PDF ne se mette à zoomer bizarrement
                                style={{ minHeight: '400px' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}