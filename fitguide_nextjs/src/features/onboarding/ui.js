'use client';

/**
 * Building blocks for the sign-in and sign-up screens, sized like a normal
 * website rather than a phone app: 16px body text, 14px sentence-case
 * labels, 44px inputs and buttons, and option cards that show their full text.
 */
import React from 'react';
import { Check, Dumbbell } from 'lucide-react';

export const inputClass = 'w-full h-11 px-3.5 rounded-lg bg-noir-eclipse border border-white-30/40 text-base text-white placeholder:text-white-30 focus:outline-none focus:border-lime-light focus:ring-2 focus:ring-lime-light/30 disabled:opacity-60 transition-colors';

const buttonBase = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg text-[15px] font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-light/60';
export const primaryButton = `${buttonBase} bg-lime-light text-noir-eclipse hover:bg-lime-light/90`;
export const secondaryButton = `${buttonBase} border border-white-30/40 text-white hover:bg-white/5`;
export const linkButton = 'text-lime-light font-semibold hover:underline cursor-pointer';

/** The FitGuide logo, as used in the site header. */
export function BrandMark() {
    return (
        <span className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-lime-light flex items-center justify-center text-noir-eclipse" aria-hidden="true">
                <Dumbbell className="w-5 h-5" />
            </span>
            <span className="text-lg font-bold text-white tracking-tight">FitGuide</span>
        </span>
    );
}

/** Header bar for the signed-out pages: logo on the left, an optional link or button on the right. */
export function AuthHeader({ children }) {
    return (
        <header className="border-b border-white-30/15">
            <div className="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
                <BrandMark />
                {children && <div className="text-sm text-white-70 text-right">{children}</div>}
            </div>
        </header>
    );
}

/**
 * The page around a sign-in or sign-up form: header, then a centred card.
 * On phones the card's frame drops away and the form fills the width.
 */
export function AuthPage({ header, width = 'max-w-[600px]', children }) {
    return (
        <div className="min-h-screen bg-noir-eclipse text-white font-poppins flex flex-col">
            <AuthHeader>{header}</AuthHeader>
            <main id="main" className="flex-1 px-4 py-8 sm:py-12">
                <div className={`mx-auto w-full ${width} sm:bg-obsidian-wave sm:border sm:border-white-30/20 sm:rounded-2xl sm:p-10 sm:shadow-xl`}>
                    {children}
                </div>
            </main>
        </div>
    );
}

/** A step's title and an optional sentence explaining it. */
export function StepHeading({ title, description, as: Tag = 'h2' }) {
    return (
        <div className="mb-6">
            <Tag className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-white">{title}</Tag>
            {description && <p className="mt-2 text-base text-white-70 leading-relaxed">{description}</p>}
        </div>
    );
}

/** A labelled group of controls. */
export function Section({ title, hint, children, className = '' }) {
    return (
        <fieldset className={className}>
            <legend className="text-sm font-semibold text-white">{title}</legend>
            {hint && <p className="mt-1 text-sm text-white-70">{hint}</p>}
            <div className="mt-3">{children}</div>
        </fieldset>
    );
}

/**
 * A selectable card: title, optional description and icon, and a tick when
 * selected. A button with aria-pressed, so it works for single and multiple choice.
 */
export function OptionCard({ selected, onClick, title, description, icon: Icon, color = '#00C4B4', className = '', ...rest }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-light/60 ${
                selected ? 'border-lime-light bg-lime-light/10' : 'border-white-30/30 bg-white/[0.03] hover:border-white-30/60 hover:bg-white/[0.06]'
            } ${className}`}
            {...rest}
        >
            {Icon && (
                <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${color}22`, color }}
                    aria-hidden="true"
                >
                    <Icon className="w-5 h-5" />
                </span>
            )}
            <span className="flex-1 min-w-0">
                <span className="block text-base font-semibold text-white leading-snug">{title}</span>
                {description && <span className="block mt-0.5 text-sm text-white-70 leading-snug">{description}</span>}
            </span>
            <span
                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-lime-light border-lime-light text-noir-eclipse' : 'border-white-30/60'
                }`}
                aria-hidden="true"
            >
                {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </span>
        </button>
    );
}

/** A small pill toggle, for quick multiple-choice answers. */
export function Chip({ selected, onClick, children, className = '', ...rest }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`h-10 px-4 rounded-full text-sm font-medium border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-light/60 ${
                selected ? 'bg-lime-light text-noir-eclipse border-lime-light' : 'bg-white/[0.03] text-white border-white-30/30 hover:border-white-30/60'
            } ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
}

/** Two or more options in one segmented control (e.g. units). */
export function Segmented({ label, options, value, onChange }) {
    return (
        <div role="group" aria-label={label} className="inline-flex p-1 rounded-lg border border-white-30/30 bg-noir-eclipse">
            {options.map(([id, text]) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    aria-pressed={value === id}
                    className={`h-9 px-3.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        value === id ? 'bg-lime-light text-noir-eclipse' : 'text-white-70 hover:text-white'
                    }`}
                >
                    {text}
                </button>
            ))}
        </div>
    );
}

/** A form field: a 14px label above the control, with an optional hint. */
export function Field({ label, htmlFor, hint, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="block text-sm font-medium text-white mb-1.5">{label}</label>
            {children}
            {hint && <p className="mt-1.5 text-sm text-white-70">{hint}</p>}
        </div>
    );
}
