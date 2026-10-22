'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * A modal built on the native <dialog>: it traps focus, closes on Escape
 * and hides the page behind it from screen readers. Render it while open.
 */
export function Modal({
  title,
  onClose,
  children,
  size = 'md',
  placement = 'center',
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** 'sheet' docks to the bottom on phones. */
  placement?: 'center' | 'sheet';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // No close() on unmount: removing the element ends the modal, and closing
  // would fire onClose again.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
  const position = placement === 'sheet'
    ? 'mb-0 sm:mb-auto rounded-t-3xl sm:rounded-3xl'
    : 'rounded-3xl';
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={`${width} ${position} w-[calc(100%-2rem)] max-h-[90vh] p-0 bg-obsidian-wave text-white border border-white-30/20 shadow-2xl backdrop:bg-noir-eclipse/80 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2 id={titleId} className="text-lg font-extrabold text-white">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-8 h-8 shrink-0 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white-70 hover:text-white"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </dialog>
  );
}
