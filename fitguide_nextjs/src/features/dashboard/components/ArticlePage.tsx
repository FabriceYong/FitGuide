'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lightbulb } from 'lucide-react';
import { AUTHOR, CATEGORY_COLORS, type Article } from '../articles';

/** One of FitGuide's own guides, read inside the home tab. */
export function ArticlePage({ article, onBack }: { article: Article; onBack: () => void }) {
  const color = CATEGORY_COLORS[article.category];
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the article so keyboard and screen-reader users start at its top.
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <article className="max-w-3xl mx-auto pb-16 space-y-8 text-left">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-white-70 hover:text-white bg-obsidian-wave border border-white/10 px-3 py-1.5 rounded-xl">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
      </button>

      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider" style={{ background: `${color}25`, color }}>{article.category}</span>
          <span className="flex items-center gap-1 text-xs text-white-70"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {article.readMinutes} min read</span>
        </div>
        <h1 ref={heading} tabIndex={-1} className="text-3xl md:text-4xl font-extrabold text-white leading-tight outline-none">{article.title}</h1>
        <p className="text-lg text-white-70 leading-relaxed">{article.description}</p>
        <p className="text-xs text-white-70 border-y border-white/10 py-3">By {AUTHOR}</p>
      </header>

      <div className="rounded-2xl overflow-hidden border border-white/10 h-56 md:h-80 bg-cover bg-center" style={{ backgroundImage: `url(https://images.unsplash.com/photo-${article.photo}?w=1200&q=75&fit=crop)` }} aria-hidden="true" />

      <section className="rounded-2xl p-5 border space-y-3" style={{ borderColor: `${color}40`, background: `${color}10` }}>
        <h2 className="text-xs font-black uppercase tracking-widest" style={{ color }}>Key points</h2>
        <ul className="space-y-2">
          {article.takeaways.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-white">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> {t}
            </li>
          ))}
        </ul>
      </section>

      {article.sections.map((s) => (
        <section key={s.heading} className="space-y-3">
          <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">{s.heading}</h2>
          {s.paragraphs.map((p) => <p key={p} className="text-white-70 leading-relaxed">{p}</p>)}
          {s.tip && (
            <p className="bg-obsidian-wave border-l-4 p-4 rounded-r-xl text-sm text-white flex gap-2" style={{ borderColor: color }}>
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> {s.tip}
            </p>
          )}
        </section>
      ))}

      <Link href={article.action.href} className="flex items-center justify-between gap-3 p-5 rounded-2xl bg-lime-light text-noir-eclipse font-extrabold">
        {article.action.label} <ArrowRight className="w-5 h-5" aria-hidden="true" />
      </Link>
      <p className="text-xs text-white-70">General information, not medical or dietary advice for your situation.</p>
    </article>
  );
}
