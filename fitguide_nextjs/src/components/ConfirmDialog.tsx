'use client';

import type { ReactNode } from 'react';
import { Modal } from './Modal';

/** Asks before doing something; render it while the question is open. */
export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  icon,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      {icon && <div className="flex justify-center mb-4" aria-hidden="true">{icon}</div>}
      <p className="text-white-70 leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-5 rounded-2xl font-bold text-white bg-white/10 hover:bg-white/15 border border-white-30/20"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`flex-1 py-3 px-5 rounded-2xl font-bold ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-lime-light text-noir-eclipse'}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
