'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { ReviewStatus } from '../../services/adminService';
import {
  deleteArticle, deleteMyArticle, fetchAdminArticles, fetchMyArticles, saveAdminArticle, saveMyArticle, setArticleStatus, submitMyArticle, toArticleInput,
  type ArticleInput, type EditorArticle,
} from '../../services/articleService';
import { ArticleEditor, blankArticle } from './ArticleEditor';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const small = 'text-xs font-bold px-3 py-2 rounded-lg';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';

const STATUS_TEXT: Record<ReviewStatus, string> = {
  draft: 'Draft',
  pending: 'Waiting for review',
  published: 'Published on the home page',
  rejected: 'Changes requested',
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Coach studio → Articles: write drafts, send them for review, see what's live. */
export function StudioArticles() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<EditorArticle[] | null>(null);
  const [editing, setEditing] = useState<{ input: ArticleInput; slug: string | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => fetchMyArticles().then(setArticles).catch((err: Error) => setMessage(err.message)), []);
  useEffect(() => { load(); }, [load]);

  const act = async (task: () => Promise<unknown>, done: string) => {
    try {
      await task();
      setMessage(done);
      await load();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  if (editing) {
    const save = (input: ArticleInput) => saveMyArticle(input, editing.slug);
    return (
      <ArticleEditor
        heading={editing.slug ? 'Edit article' : 'New article'}
        initial={editing.input}
        authorName={user?.name || 'You'}
        onCancel={() => setEditing(null)}
        actions={[
          { label: 'Save draft', run: async (input) => { await save(input); setEditing(null); setMessage('Draft saved.'); await load(); } },
          {
            label: 'Send for review',
            primary: true,
            run: async (input) => {
              const saved = await save(input);
              await submitMyArticle(saved.slug);
              setEditing(null);
              setMessage('Sent for review. It appears on the home page once the FitGuide team approves it.');
              await load();
            },
          },
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white-70 max-w-3xl">Write articles for FitGuide members: training advice, nutrition, recovery. Send one for review and it appears on the home page of the website and the app, with your name, once the FitGuide team approves it.</p>
        <button onClick={() => setEditing({ input: blankArticle(), slug: null })} className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-lime-light text-noir-eclipse"><Plus className="w-4 h-4" /> New article</button>
      </div>
      {message && <p role="status" className="text-sm bg-white/5 border border-white-30/10 rounded-xl px-4 py-3">{message}</p>}
      {!articles ? <Loader2 className="w-5 h-5 animate-spin" /> : articles.length === 0 ? (
        <p className="text-white-70 text-sm">You haven&apos;t written an article yet.</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.slug} className={`${card} flex flex-wrap items-start justify-between gap-3`}>
              <div className="min-w-0">
                <p className="font-bold">{a.title}</p>
                <p className="text-xs text-white-70">{STATUS_TEXT[a.status]}{a.status === 'published' && a.publishedAt ? ` since ${when(a.publishedAt)}` : ''} · {a.category.toLowerCase()} · {a.readMinutes} min read</p>
                {a.status === 'rejected' && a.reviewNote && <p className="text-sm text-amber-200 mt-1">Reviewer: {a.reviewNote}</p>}
              </div>
              <div className="flex gap-2">
                {a.status === 'published' && <Link href={`/articles/${a.slug}`} className={`${small} bg-white/10`}>View</Link>}
                {(a.status === 'draft' || a.status === 'rejected') && (
                  <>
                    <button onClick={() => setEditing({ input: toArticleInput(a), slug: a.slug })} className={`${small} bg-white/10`}>Edit</button>
                    <button onClick={() => act(() => submitMyArticle(a.slug), 'Sent for review.')} className={`${small} flex items-center gap-1 bg-lime-light text-noir-eclipse`}><Send className="w-3.5 h-3.5" /> Send for review</button>
                  </>
                )}
                {a.status !== 'published' && (
                  <button onClick={() => window.confirm(`Delete “${a.title}”?`) && act(() => deleteMyArticle(a.slug), 'Deleted.')} aria-label={`Delete ${a.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One article waiting for review: read it, then publish or send it back. */
function ArticleReview({ article: a, onDone, onEdit }: { article: EditorArticle; onDone: () => void; onEdit: () => void }) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const decide = (status: 'published' | 'rejected') => setArticleStatus(a.slug, status, note).then(onDone).catch((err: Error) => setError(err.message));
  return (
    <li className={`${card} space-y-3`}>
      <div>
        <p className="font-bold">{a.title} <span className="text-xs text-white-70 font-normal">· by {a.author.fullName || a.author.name}</span></p>
        <p className="text-xs text-white-70">{a.category.toLowerCase()} · {a.readMinutes} min read · {a.sections.length} sections</p>
      </div>
      <p className="text-sm text-white-70">{a.description}</p>
      <details className="text-sm">
        <summary className="cursor-pointer font-bold text-lime-light">Read the article</summary>
        <div className="mt-3 space-y-3">
          {a.takeaways.length > 0 && <ul className="list-disc pl-5 text-white">{a.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>}
          {a.sections.map((s, i) => (
            <div key={i} className="space-y-1">
              <p className="font-bold">{s.heading}</p>
              {s.paragraphs.map((p, j) => <p key={j} className="text-white-70 whitespace-pre-line">{p}</p>)}
              {s.tip && <p className="text-white italic">Tip: {s.tip}</p>}
            </div>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => decide('published')} className={`${small} bg-lime-light text-noir-eclipse flex items-center gap-1`}><Check className="w-3.5 h-3.5" /> Publish</button>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" aria-label="Note for the writer" className={`${field} max-w-xs`} />
        <button onClick={() => decide('rejected')} disabled={!note.trim()} className={`${small} bg-white/10 flex items-center gap-1 disabled:opacity-50`}><X className="w-3.5 h-3.5" /> Send back</button>
        <button onClick={onEdit} className={`${small} bg-white/10 flex items-center gap-1`}><Pencil className="w-3.5 h-3.5" /> Fix it myself</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </li>
  );
}

/** Admin → Articles: review coaches' articles, write your own, fix or take down any. */
export function AdminArticles() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'' | ReviewStatus>('pending');
  const [articles, setArticles] = useState<EditorArticle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ input: ArticleInput; slug: string | null; authorName: string } | null>(null);

  const load = useCallback(() => fetchAdminArticles(status || undefined).then(setArticles).catch((err: Error) => setError(err.message)), [status]);
  useEffect(() => { load(); }, [load]);
  const act = (task: () => Promise<unknown>) => task().then(load).catch((err: Error) => setError(err.message));

  if (editing) {
    const done = async () => { setEditing(null); await load(); };
    return (
      <ArticleEditor
        heading={editing.slug ? 'Edit article' : 'New article'}
        initial={editing.input}
        authorName={editing.authorName}
        onCancel={() => setEditing(null)}
        actions={editing.slug
          ? [{ label: 'Save changes', primary: true, run: async (input) => { await saveAdminArticle(input, editing.slug); await done(); } }]
          : [
            { label: 'Save as draft', run: async (input) => { await saveAdminArticle(input, null, false); await done(); } },
            { label: 'Publish', primary: true, run: async (input) => { await saveAdminArticle(input, null, true); await done(); } },
          ]}
      />
    );
  }

  const edit = (a: EditorArticle) => setEditing({ input: toArticleInput(a), slug: a.slug, authorName: a.author.name });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as '' | ReviewStatus)} aria-label="Show" className={`${field} w-auto`}>
          <option value="pending">To review</option>
          <option value="published">Published</option>
          <option value="">All</option>
        </select>
        <button onClick={() => setEditing({ input: blankArticle(), slug: null, authorName: user?.name || 'FitGuide' })} className={`${small} bg-lime-light text-noir-eclipse flex items-center gap-1 shrink-0`}><Plus className="w-3.5 h-3.5" /> New article</button>
      </div>
      {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
      {!articles ? <Loader2 className="w-5 h-5 animate-spin" /> : status === 'pending' ? (
        articles.length ? <ul className="space-y-3">{articles.map((a) => <ArticleReview key={a.slug} article={a} onDone={load} onEdit={() => edit(a)} />)}</ul> : <p className="text-sm text-white-70">Nothing to review.</p>
      ) : articles.length === 0 ? <p className="text-sm text-white-70">No articles yet.</p> : (
        <ul className="divide-y divide-white-30/10">
          {articles.map((a) => (
            <li key={a.slug} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="flex-1 min-w-[200px]">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-white-70">by {a.author.fullName || a.author.name} · {STATUS_TEXT[a.status]}{a.publishedAt && a.status === 'published' ? ` · ${when(a.publishedAt)}` : ''}</p>
              </div>
              {a.status === 'published' && <Link href={`/articles/${a.slug}`} className={`${small} bg-white/10`}>View</Link>}
              {a.status === 'published'
                ? <button onClick={() => window.confirm(`Take “${a.title}” off the home page?`) && act(() => setArticleStatus(a.slug, 'draft'))} className={`${small} bg-white/10 flex items-center gap-1`}><Undo2 className="w-3.5 h-3.5" /> Unpublish</button>
                : <button onClick={() => act(() => setArticleStatus(a.slug, 'published'))} className={`${small} bg-lime-light text-noir-eclipse flex items-center gap-1`}><Check className="w-3.5 h-3.5" /> Publish</button>}
              <button onClick={() => edit(a)} aria-label={`Edit ${a.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => window.confirm(`Delete “${a.title}” for good?`) && act(() => deleteArticle(a.slug))} aria-label={`Delete ${a.title}`} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-red-300"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
