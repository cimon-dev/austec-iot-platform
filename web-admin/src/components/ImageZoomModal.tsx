"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ImageZoomModalProps {
  isOpen?: boolean;
  src?: string | null;
  imageUrl?: string | null;
  alt?: string;
  altText?: string;
  title?: string;
  onClose: () => void;
}

export function ImageZoomModal({
  isOpen = true,
  src,
  imageUrl,
  alt,
  altText,
  title,
  onClose,
}: ImageZoomModalProps) {
  const activeSrc = src || imageUrl;
  const activeAlt = alt || altText || title || "Ảnh phóng to";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen && activeSrc) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, activeSrc, onClose]);

  if (!isOpen || !activeSrc) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl p-2 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 hover:bg-black text-white transition-colors z-10 cursor-pointer border border-white/20"
          title="Đóng (ESC)"
        >
          <X className="w-5 h-5" />
        </button>
        <img 
          src={activeSrc} 
          alt={activeAlt} 
          className="max-h-[82vh] w-auto max-w-full object-contain rounded-lg"
        />
        {activeAlt && (
          <div className="pt-2 text-center text-xs text-zinc-400 font-medium truncate max-w-lg">
            {activeAlt}
          </div>
        )}
      </div>
    </div>
  );
}
