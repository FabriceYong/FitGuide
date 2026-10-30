'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, LogOut, User } from 'lucide-react';

/**
 * The profile button in the dashboard header. It opens a small menu with the
 * profile and sign-out, so sign-out isn't one stray click away in the header.
 * Closes on Escape, on a click elsewhere, and after choosing an item.
 */
export function ProfileMenu({ name, detail, avatar, isGuest, onProfile, onSignOut }: {
  name: string;
  detail: string;
  avatar: ReactNode;
  isGuest: boolean;
  onProfile: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    // Keyboard users land on the first item.
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };
  const item = 'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none';

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-white/5"
      >
        <span className="sr-only lg:hidden">Your account</span>
        <span className="text-right hidden lg:block">
          <span className="block text-sm font-bold text-white">{name}</span>
          <span className="block text-[11px] text-white-70">{detail}</span>
        </span>
        {avatar}
        <ChevronDown className={`w-4 h-4 text-white-70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Your account"
          className="absolute right-0 top-full mt-2 w-56 py-1.5 rounded-xl bg-obsidian-wave border border-white-30/15 shadow-xl z-40"
        >
          <button type="button" role="menuitem" onClick={choose(onProfile)} className={`${item} text-white`}>
            <User className="w-4 h-4" aria-hidden="true" /> Your profile
          </button>
          <div className="my-1 border-t border-white-30/10" role="separator" />
          <button type="button" role="menuitem" onClick={choose(onSignOut)} className={`${item} text-red-300`}>
            <LogOut className="w-4 h-4" aria-hidden="true" /> {isGuest ? 'Leave guest mode' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
