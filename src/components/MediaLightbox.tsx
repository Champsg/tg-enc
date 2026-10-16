import React from 'react';
import { X, Download } from 'lucide-react';

interface MediaLightboxProps {
  imageUrl: string | null;
  fileName?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  imageUrl,
  fileName,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
      >
        <div className="absolute -top-12 right-0 flex items-center gap-3">
          <a
            href={imageUrl}
            download={fileName || 'decrypted_image.jpg'}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Download full image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            title="Close viewer"
            aria-label="Close image viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <img
          src={imageUrl}
          alt={fileName || 'Encrypted Photo'}
          className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
        />

        {fileName && (
          <p className="text-xs text-slate-300 mt-3 truncate max-w-md text-center">
            {fileName}
          </p>
        )}
      </div>
    </div>
  );
};
