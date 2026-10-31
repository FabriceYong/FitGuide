'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { ArrowDown, ArrowUp, Eye, Film, ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react';
import { draftArticle, fetchAiStatus, polishText } from '../../services/aiService';
import {
  ARTICLE_CATEGORIES, coverSrc, uploadArticleCover, uploadArticleVideo,
  type ArticleCategory, type ArticleInput,
} from '../../services/articleService';
import { ArticlePage } from '../dashboard/components/ArticlePage';

const card = 'bg-obsidian-wave border border-white-30/10 rounded-2xl p-5';
const field = 'w-full bg-noir-eclipse border border-white-30/20 rounded-xl px-3 py-2 text-sm text-white';
const label = 'block text-xs font-bold text-white-70';

// Sections are edited as one text box each; a blank line starts a new paragraph.
type DraftVideo = { url: string; title: string; description: string; transcript: string };
type DraftSection = { heading: string; body: string; video: DraftVideo | null; tip: string };

const blankVideo = (): DraftVideo => ({ url: '', title: '', description: '', transcript: '' });

export const blankArticle = (): ArticleInput => ({
  title: '', description: '', category: 'TRAINING', coverImageUrl: null, takeaways: [], sections: [{ heading: '', paragraphs: [''] }],
});

const toDraft = (a: ArticleInput) => ({
  ...a,
  takeawaysText: a.takeaways.join('\n'),
  draftSections: a.sections.map((s): DraftSection => ({
    heading: s.heading,
    body: s.paragraphs.join('\n\n'),
    video: s.video ? { url: s.video.url, title: s.video.title, description: s.video.description || '', transcript: s.video.transcript || '' } : null,
    tip: s.tip || '',
  })),
});

function toInput(d: ReturnType<typeof toDraft>): ArticleInput {
  return {
    title: d.title.trim(),
    description: d.description.trim(),
    category: d.category,
    coverImageUrl: d.coverImageUrl || null,
    takeaways: d.takeawaysText.split('\n').map((t) => t.trim()).filter(Boolean),
    sections: d.draftSections.map((s) => ({
      heading: s.heading.trim(),
      paragraphs: s.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      ...(s.video && {
        video: {
          url: s.video.url.trim(),
          title: s.video.title.trim(),
          ...(s.video.description.trim() && { description: s.video.description.trim() }),
          ...(s.video.transcript.trim() && { transcript: s.video.transcript.trim() }),
        },
      }),
      ...(s.tip.trim() && { tip: s.tip.trim() }),
    })),
  };
}

const words = (input: ArticleInput) =>
  [input.description, ...input.takeaways, ...input.sections.flatMap((s) => [s.heading, ...s.paragraphs, s.tip || ''])].join(' ').split(/\s+/).filter(Boolean).length;

export type EditorAction = { label: string; primary?: boolean; run: (input: ArticleInput) => Promise<unknown> };

/**
 * Write or edit an article: title, summary, category, cover, key points and
 * sections, with a preview of how readers will see it. Used by the coach
 * studio and the admin CMS, which pass their own save buttons.
 */
export function ArticleEditor({ initial, heading, actions, onCancel, authorName }: {
  initial: ArticleInput;
  heading: string;
  actions: EditorAction[];
  onCancel: () => void;
  authorName: string;
}) {
  const [d, setD] = useState(() => toDraft(initial));
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = toInput(d);

  // Each change applies to the latest draft, so quick successive edits don't undo each other.
  const patch = (change: Partial<ReturnType<typeof toDraft>>) => setD((cur) => ({ ...cur, ...change }));
  const setSection = (i: number, change: Partial<DraftSection>) =>
    setD((cur) => ({ ...cur, draftSections: cur.draftSections.map((s, j) => (j === i ? { ...s, ...change } : s)) }));
  const setVideo = (i: number, change: Partial<DraftVideo>) =>
    setD((cur) => ({ ...cur, draftSections: cur.draftSections.map((s, j) => (j === i && s.video ? { ...s, video: { ...s.video, ...change } } : s)) }));
  const moveSection = (i: number, by: number) => setD((cur) => {
    const next = [...cur.draftSections];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    return { ...cur, draftSections: next };
  });

  // Writing help, when the server has AI set up.
  const [canAssist, setCanAssist] = useState(false);
  const [assistNote, setAssistNote] = useState<string | null>(null);
  // A section's text before "Tidy up", for undo.
  const [before, setBefore] = useState<Record<number, string>>({});
  useEffect(() => {
    fetchAiStatus().then((s) => setCanAssist(s.available)).catch(() => setCanAssist(false));
  }, []);

  /** Fill the empty parts from the title, using whatever's written so far as notes. */
  const draftWithAi = async () => {
    setBusy('draft');
    setError(null);
    setAssistNote(null);
    try {
      const notes = [d.description, d.takeawaysText, ...d.draftSections.map((s) => `${s.heading}\n${s.body}`)].join('\n').trim();
      const { draft } = await draftArticle({ title: d.title.trim(), category: d.category, ...(notes && { notes: notes.slice(0, 2000) }) });
      const emptySections = d.draftSections.every((s) => !s.heading.trim() && !s.body.trim());
      setD((cur) => ({
        ...cur,
        description: cur.description.trim() ? cur.description : draft.description,
        takeawaysText: cur.takeawaysText.trim() ? cur.takeawaysText : draft.takeaways.join('\n'),
        draftSections: emptySections
          ? draft.sections.map((s) => ({ heading: s.heading, body: s.paragraphs.join('\n\n'), video: null, tip: s.tip || '' }))
          : cur.draftSections,
      }));
      setAssistNote(emptySections
        ? 'Draft added below. Read it through and make it yours before sending.'
        : 'Filled in the summary and key points that were empty. Your sections are unchanged.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const tidy = async (i: number) => {
    const s = d.draftSections[i];
    setBusy(`tidy-${i}`);
    setError(null);
    try {
      const { text } = await polishText({ heading: s.heading, text: s.body });
      setBefore((b) => ({ ...b, [i]: s.body }));
      setSection(i, { body: text });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('cover');
    setError(null);
    try {
      patch({ coverImageUrl: await uploadArticleCover(file) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const uploadVideo = async (i: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(`video-${i}`);
    setError(null);
    try {
      setVideo(i, { url: await uploadArticleVideo(file) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const run = async (action: EditorAction) => {
    setBusy(action.label);
    setError(null);
    try {
      await action.run(input);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  };

  const minutes = Math.max(1, Math.round(words(input) / 220));
  const cover = coverSrc(d.coverImageUrl);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-extrabold text-lg">{heading}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(!preview)} aria-pressed={preview} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10">
            {preview ? <><Pencil className="w-3.5 h-3.5" /> Edit</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
          </button>
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10"><X className="w-3.5 h-3.5" /> Cancel</button>
        </div>
      </div>

      {preview ? (
        <div className={card}>
          <ArticlePage article={{
            slug: 'preview', title: input.title || 'Untitled article', category: input.category, readMinutes: minutes, imageUrl: cover,
            description: input.description, takeaways: input.takeaways,
            sections: input.sections.filter((s) => s.heading || s.paragraphs.length || s.video).map((s) => (s.video?.url ? s : { ...s, video: undefined })),
            author: { name: authorName, href: null }, publishedAt: null, action: null,
          }} preview />
        </div>
      ) : (
        <div className={`${card} space-y-5`}>
          <div className="grid md:grid-cols-[1fr_200px] gap-3">
            <label className={label}>Title<input required maxLength={160} value={d.title} onChange={(e) => patch({ title: e.target.value })} className={`${field} mt-1`} /></label>
            <label className={label}>Category
              <select value={d.category} onChange={(e) => patch({ category: e.target.value as ArticleCategory })} className={`${field} mt-1`}>
                {ARTICLE_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
              </select>
            </label>
          </div>
          {canAssist && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-lime-light/25 bg-lime-light/5 px-4 py-3">
              <button type="button" onClick={draftWithAi} disabled={busy !== null || d.title.trim().length < 5} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-lime-light text-noir-eclipse disabled:opacity-50">
                {busy === 'draft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Draft with AI
              </button>
              <span className="text-xs text-white-70 flex-1 min-w-48">{assistNote || 'Writes a first draft from your title and any notes below. You review and edit everything.'}</span>
            </div>
          )}
          <label className={label}>Summary <span className="font-normal">(one or two sentences, shown on the home page)</span>
            <textarea maxLength={300} rows={2} value={d.description} onChange={(e) => patch({ description: e.target.value })} className={`${field} mt-1`} />
          </label>

          <div className="space-y-2">
            <span className={label}>Cover picture</span>
            <div className="flex flex-wrap items-center gap-3">
              {cover
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cover} alt="" className="w-40 h-24 object-cover rounded-xl border border-white-30/10" />
                : <span className="w-40 h-24 rounded-xl border border-dashed border-white-30/30 flex items-center justify-center text-xs text-white-70">No picture</span>}
              <label className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 cursor-pointer">
                {busy === 'cover' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} Upload
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={upload} />
              </label>
              {d.coverImageUrl && <button type="button" onClick={() => patch({ coverImageUrl: null })} className="text-xs font-bold text-red-300">Remove</button>}
            </div>
            <input
              placeholder="…or paste an https:// link to a picture you may use"
              aria-label="Cover picture link"
              value={d.coverImageUrl?.startsWith('https://') ? d.coverImageUrl : ''}
              onChange={(e) => patch({ coverImageUrl: e.target.value || null })}
              className={field}
            />
          </div>

          <label className={label}>Key points <span className="font-normal">(one per line, up to 6)</span>
            <textarea rows={3} value={d.takeawaysText} onChange={(e) => patch({ takeawaysText: e.target.value })} className={`${field} mt-1`} />
          </label>

          <div className="space-y-3">
            <span className={label}>Sections</span>
            {d.draftSections.map((s, i) => (
              <fieldset key={i} className="border border-white-30/15 rounded-xl p-4 space-y-3">
                <legend className="px-1 text-xs font-bold text-white-70">Section {i + 1}</legend>
                <div className="flex gap-2">
                  <input placeholder="Heading" aria-label={`Section ${i + 1} heading`} maxLength={120} value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} className={field} />
                  <button type="button" disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label={`Move section ${i + 1} up`} className="w-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" disabled={i === d.draftSections.length - 1} onClick={() => moveSection(i, 1)} aria-label={`Move section ${i + 1} down`} className="w-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" disabled={d.draftSections.length === 1} onClick={() => setD((cur) => ({ ...cur, draftSections: cur.draftSections.filter((_, j) => j !== i) }))} aria-label={`Remove section ${i + 1}`} className="w-9 shrink-0 rounded-lg bg-white/10 flex items-center justify-center text-red-300 disabled:opacity-30"><Trash2 className="w-4 h-4" /></button>
                </div>
                <textarea placeholder="Text. Leave a blank line between paragraphs." aria-label={`Section ${i + 1} text`} rows={5} value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} className={field} />
                {canAssist && s.body.trim().length >= 20 && (
                  <div className="flex items-center gap-3 -mt-1">
                    <button type="button" onClick={() => tidy(i)} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-bold text-lime-light disabled:opacity-50">
                      {busy === `tidy-${i}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />} Tidy up this section
                    </button>
                    {before[i] !== undefined && (
                      <button type="button" onClick={() => { setSection(i, { body: before[i] }); setBefore((b) => { const next = { ...b }; delete next[i]; return next; }); }} className="text-xs font-bold text-white-70 underline">
                        Undo
                      </button>
                    )}
                  </div>
                )}
                {s.video ? (
                  <div className="rounded-xl border border-white-30/15 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={label}>Video <span className="font-normal">(plays after the text, starting as readers scroll to it)</span></span>
                      <button type="button" onClick={() => setSection(i, { video: null })} className="text-xs font-bold text-red-300 shrink-0">Remove video</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10 cursor-pointer">
                        {busy === `video-${i}` ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</> : <><Upload className="w-3.5 h-3.5" /> {s.video.url.startsWith('/uploads/') ? 'Replace video' : 'Upload video'}</>}
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" disabled={busy !== null} onChange={(e) => uploadVideo(i, e)} aria-label={`Upload a video for section ${i + 1}`} />
                      </label>
                      <span className="text-xs text-white-70">{s.video.url.startsWith('/uploads/') ? 'Video uploaded.' : 'MP4, WebM or MOV, up to 100 MB. MP4 plays on every device.'}</span>
                    </div>
                    <input
                      placeholder="…or paste an https:// link straight to an .mp4 or .webm file"
                      aria-label={`Section ${i + 1} video link`}
                      value={s.video.url.startsWith('/uploads/') ? '' : s.video.url}
                      onChange={(e) => setVideo(i, { url: e.target.value })}
                      className={field}
                    />
                    <input placeholder="Video title" aria-label={`Section ${i + 1} video title`} maxLength={120} value={s.video.title} onChange={(e) => setVideo(i, { title: e.target.value })} className={field} />
                    <input placeholder="One line about the video (optional)" aria-label={`Section ${i + 1} video description`} maxLength={300} value={s.video.description} onChange={(e) => setVideo(i, { description: e.target.value })} className={field} />
                    <textarea placeholder="Transcript (optional, helps readers who can’t play sound)" aria-label={`Section ${i + 1} video transcript`} maxLength={5000} rows={3} value={s.video.transcript} onChange={(e) => setVideo(i, { transcript: e.target.value })} className={field} />
                  </div>
                ) : (
                  <button type="button" onClick={() => setSection(i, { video: blankVideo() })} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10"><Film className="w-3.5 h-3.5" /> Add video</button>
                )}
                <input placeholder="Tip (optional)" aria-label={`Section ${i + 1} tip`} maxLength={500} value={s.tip} onChange={(e) => setSection(i, { tip: e.target.value })} className={field} />
              </fieldset>
            ))}
            <button type="button" onClick={() => setD((cur) => ({ ...cur, draftSections: [...cur.draftSections, { heading: '', body: '', video: null, tip: '' }] }))} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-white/10"><Plus className="w-3.5 h-3.5" /> Add section</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button key={a.label} type="button" onClick={() => run(a)} disabled={busy !== null} className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-50 ${a.primary ? 'bg-lime-light text-noir-eclipse' : 'bg-white/10'}`}>
            {busy === a.label && <Loader2 className="w-4 h-4 animate-spin" />} {a.label}
          </button>
        ))}
        <span className="text-xs text-white-70">About {minutes} min read</span>
      </div>
    </div>
  );
}
