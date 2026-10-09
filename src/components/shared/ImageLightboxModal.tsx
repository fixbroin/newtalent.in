"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LightboxImageItem {
  url: string;
  label?: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl?: string | null;
  images?: LightboxImageItem[];
  currentIndex?: number;
  onClose: () => void;
  title?: string;
}

export default function ImageLightboxModal({
  isOpen,
  imageUrl,
  images,
  currentIndex = 0,
  onClose,
  title
}: ImageLightboxModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeIdx, setActiveIdx] = useState(currentIndex);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveIdx(currentIndex);
    }
  }, [isOpen, currentIndex]);

  const gallery = images && images.length > 0
    ? images
    : imageUrl ? [{ url: imageUrl, label: title }] : [];

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (gallery.length === 0) return;
    setActiveIdx(prev => (prev - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (gallery.length === 0) return;
    setActiveIdx(prev => (prev + 1) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!mounted || !isOpen || gallery.length === 0) return null;

  const currentItem = gallery[activeIdx] || gallery[0];
  const currentLabel = currentItem.label || title || "Photo View";
  const hasMultiple = gallery.length > 1;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200 backdrop-blur-md"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      {/* Top Bar / Close & Title */}
      <div className="absolute top-4 inset-x-4 sm:top-6 sm:inset-x-8 z-[10000] flex items-center justify-between pointer-events-none">
        <div className="text-white text-xs sm:text-sm font-black bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 pointer-events-auto flex items-center gap-2">
          {hasMultiple && (
            <span className="text-amber-400 font-extrabold">{activeIdx + 1} / {gallery.length}</span>
          )}
          {hasMultiple && <span>•</span>}
          <span className="truncate max-w-[200px] sm:max-w-md">{currentLabel}</span>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/60 border border-white/20 transition-all pointer-events-auto shadow-xl"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-7 w-7" />
        </Button>
      </div>

      {/* Navigation Arrows */}
      {hasMultiple && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 z-[10000] h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 hover:scale-110 transition-all shadow-2xl"
            onClick={handlePrev}
            title="Previous Photo (Left Arrow)"
          >
            <ChevronLeft className="h-8 w-8 sm:h-9 sm:w-9" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 z-[10000] h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-black/60 border border-white/20 text-white hover:bg-white/20 hover:scale-110 transition-all shadow-2xl"
            onClick={handleNext}
            title="Next Photo (Right Arrow)"
          >
            <ChevronRight className="h-8 w-8 sm:h-9 sm:w-9" />
          </Button>
        </>
      )}

      {/* Main Image Container */}
      <div 
        className="relative w-full h-full max-w-5xl max-h-[88vh] flex items-center justify-center p-2 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          key={currentItem.url}
          src={currentItem.url} 
          alt={currentLabel} 
          className="max-w-full max-h-[88vh] w-auto h-auto object-contain rounded-2xl shadow-2xl select-none animate-in zoom-in-95 duration-200"
        />
      </div>

      {/* Bottom Hint Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-[11px] font-bold uppercase tracking-widest pointer-events-none bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm flex items-center gap-3">
        {hasMultiple ? (
          <>
            <span>Use ◄ / ► arrow keys or click arrows to view images</span>
          </>
        ) : (
          <span>Click anywhere to close</span>
        )}
      </div>
    </div>,
    document.body
  );
}
