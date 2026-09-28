"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ArtistCertificate } from '@/types/firestore';

interface CertificateLightboxModalProps {
  isOpen: boolean;
  certificate: ArtistCertificate | null;
  onClose: () => void;
}

export default function CertificateLightboxModal({
  isOpen,
  certificate,
  onClose,
}: CertificateLightboxModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen || !certificate) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[10000] flex items-center gap-3">
        <div className="text-white text-xs sm:text-sm font-bold bg-white/10 px-4 py-2 rounded-full hidden sm:block">
          {certificate.name}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/50 border border-white/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div 
        className="relative w-full h-full max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {certificate.type === 'pdf' ? (
          <iframe 
            src={`${certificate.url}#toolbar=0&navpanes=0&scrollbar=0`} 
            className="w-full h-full border-none rounded-2xl bg-white"
            title={certificate.name}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src={certificate.url} 
              alt={certificate.name} 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl select-none"
            />
          </div>
        )}
      </div>

      <div className="mt-4 text-white/60 text-xs font-medium sm:hidden">
        {certificate.name}
      </div>
    </div>,
    document.body
  );
}
