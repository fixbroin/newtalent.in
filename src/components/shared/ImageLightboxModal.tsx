"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  title?: string;
}

export default function ImageLightboxModal({
  isOpen,
  imageUrl,
  onClose,
  title
}: ImageLightboxModalProps) {
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

  if (!mounted || !isOpen || !imageUrl) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      {/* Top Bar / Close Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[10000] flex items-center gap-3">
        {title && (
          <div className="text-white text-xs sm:text-sm font-bold bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm hidden sm:block">
            {title}
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/50 border border-white/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-7 w-7" />
        </Button>
      </div>

      {/* Main Image Container */}
      <div 
        className="relative w-full h-full max-w-5xl max-h-[90vh] flex items-center justify-center p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt={title || "Full view"} 
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
        />
      </div>

      {/* Mobile Touch Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-[10px] uppercase tracking-widest pointer-events-none md:hidden font-semibold">
        Tap anywhere to close
      </div>
    </div>,
    document.body
  );
}
