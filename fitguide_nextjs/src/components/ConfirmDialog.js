'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmButtonClass = 'bg-red-500 hover:bg-red-600 text-white', icon, }) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-noir-eclipse/80 backdrop-blur-sm animate-fadeIn" onClick={handleBackdropClick}>
      <div className="relative bg-obsidian-wave border border-white-30/20 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scaleIn">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white-30/10 hover:bg-white-30/20 flex items-center justify-center transition-colors" aria-label="Close dialog">
          <X className="w-4 h-4 text-white-70"/>
        </button>

        {/* Icon */}
        {icon && (<div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-white-30/10 flex items-center justify-center">
              {icon}
            </div>
          </div>)}

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-3 text-center pr-8">
          {title}
        </h2>

        {/* Message */}
        <p className="text-white-70 text-center mb-6 leading-relaxed">
          {message}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {/* Cancel Button */}
          <button onClick={onClose} className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-white bg-white-30/10 hover:bg-white-30/20 border border-white-30/20 hover:border-white-30/40 transition-all duration-200 active:scale-95">
            {cancelText}
          </button>

          {/* Confirm Button */}
          <button onClick={() => {
            onConfirm();
            onClose();
        }} className={`flex-1 py-3.5 px-6 rounded-2xl font-bold transition-all duration-200 active:scale-95 ${confirmButtonClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>);
};
