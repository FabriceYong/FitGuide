'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lightbulb, Loader2 } from 'lucide-react';
import { ARTICLES, CATEGORY_COLORS, builtInView, writtenView, type ArticleView } from '../articles';
import { fetchPublishedArticle } from '../../../services/articleService';
import { ArticleVideo } from '../../articles/ArticleVideo';

/** One article: a built-in guide or one a coach or admin wrote. `preview` is the editor's view of a draft. */
export function ArticlePage({ article, preview = false }: { article: ArticleView; preview?: boolean }) {
  const color = CATEGORY_COLORS[article.category];
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the article so keyboard and screen-reader users start at its top.
  useEffect(() => {
    if (preview) return;
    heading.current?.focus();
    window.scrollTo({ top: 0 });
  }, [preview]);

  return (
    <article className="max-w-3xl mx-auto pb-16 space-y-8 text-left">
      {!preview && <Link href="/" className="inline-flex items-center gap-2 text-sm text-white-70 hover:text-white bg-obsidian-wave border border-white/10 px-3 py-1.5 rounded-xl">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
      </Link>}

      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider" style={{ background: `${color}25`, color }}>{article.category}</span>
          <span className="flex items-center gap-1 text-xs text-white-70"><Clock className="w-3.5 h-3.5" aria-hidden="true" /> {article.readMinutes} min read</span>
        </div>
        <h1 ref={heading} tabIndex={-1} className="text-3xl md:text-4xl font-extrabold text-white leading-tight outline-none">{article.title}</h1>
        <p className="text-lg text-white-70 leading-relaxed">{article.description}</p>
        <p className="text-xs text-white-70 border-y border-white/10 py-3">
          By {article.author.href ? <Link href={article.author.href} className="font-bold text-white hover:text-lime-light">{article.author.name}</Link> : article.author.name}
          {article.publishedAt && <> · {new Date(article.publishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</>}
        </p>
      </header>

      {article.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-white/10 h-56 md:h-80 bg-cover bg-center" style={{ backgroundImage: `url(${article.imageUrl})` }} aria-hidden="true" />
      )}

      {article.takeaways.length > 0 && (
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
      )}

      {article.sections.map((s, i) => (
        <section key={`${i}-${s.heading}`} className="space-y-3">
          <h2 className="text-xl md:text-2xl font-extrabold text-white pt-3 border-t border-white/10">{s.heading}</h2>
          {s.paragraphs.map((p, j) => <p key={j} className="text-white-70 leading-relaxed whitespace-pre-line">{p}</p>)}
          {s.video && <ArticleVideo video={s.video} />}
          {s.tip && (
            <p className="bg-obsidian-wave border-l-4 p-4 rounded-r-xl text-sm text-white flex gap-2" style={{ borderColor: color }}>
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} aria-hidden="true" /> {s.tip}
            </p>
          )}
        </section>
      ))}

      {article.action && (
        <Link href={article.action.href} className="flex items-center justify-between gap-3 p-5 rounded-2xl bg-lime-light text-noir-eclipse font-extrabold">
          {article.action.label} <ArrowRight className="w-5 h-5" aria-hidden="true" />
        </Link>
      )}
      <p className="text-xs text-white-70">General information, not medical or dietary advice for your situation.</p>
    </article>
  );
}

/** /articles/[slug]: a built-in guide, or a published article fetched from the API. */
export function ArticleBySlug({ slug }: { slug: string }) {
  const builtIn = ARTICLES.find((a) => a.id === slug);
  const [written, setWritten] = useState<ArticleView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (builtIn) return;
    fetchPublishedArticle(slug).then((a) => setWritten(writtenView(a))).catch((err: Error) => setError(err.message));
  }, [builtIn, slug]);

  if (builtIn) return <ArticlePage article={builtInView(builtIn)} />;
  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <p role="alert" className="text-white-70">{error === 'Article not found.' ? 'This article isn’t available. It may have been taken down.' : error}</p>
        <Link href="/" className="text-sm font-bold text-lime-light">Back to home</Link>
      </div>
    );
  }
  if (!written) return <Loader2 className="w-5 h-5 animate-spin" aria-label="Loading article" />;
  return <ArticlePage article={written} />;
}
