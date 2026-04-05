"use client";

import { CheckCircle2, AlertTriangle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm border border-gray-200 shadow-2xl overflow-hidden">
        <div className="p-8 space-y-6 text-center">
            <div className="flex justify-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-black'}`}>
                    {isDestructive ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
                </div>
            </div>
          
            <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-2" style={{ fontFamily: "var(--font-cinzel), Georgia, serif" }}>{title}</h3>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest leading-relaxed">{message}</p>
            </div>

            <div className="flex flex-col gap-3 pt-4 font-bold">
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className={`w-full py-4 text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm ${
                        isDestructive 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                >
                    {confirmLabel}
                </button>
                <button
                    onClick={onClose}
                    className="w-full py-4 text-[10px] uppercase tracking-[0.2em] bg-white border border-gray-200 text-gray-400 hover:border-black hover:text-black transition-all"
                >
                    {cancelLabel}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

