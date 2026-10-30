'use client';

/** Articles written by coaches and admins: reading, the studio and the admin CMS. */
import { apiRequest, assetUrl } from '../lib/api';
import type { ReviewStatus } from './adminService';

export const ARTICLE_CATEGORIES = ['TRAINING', 'NUTRITION', 'RECOVERY'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** A video shown after a section's text; it starts playing, muted, as the reader scrolls to it. */
export interface ArticleVideo {
  /** An uploaded file (/uploads/...) or an https link straight to an .mp4 or .webm file. */
  url: string;
  title: string;
  description?: string;
  transcript?: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
  video?: ArticleVideo;
  tip?: string;
}

/** What a coach or admin writes. */
export interface ArticleInput {
  title: string;
  description: string;
  category: ArticleCategory;
  coverImageUrl: string | null;
  takeaways: string[];
  sections: ArticleSection[];
}

/** A published article, as readers get it. */
export interface WrittenArticle extends ArticleInput {
  slug: string;
  readMinutes: number;
  publishedAt: string | null;
  author: { name: string; coachId: string | null };
}

/** An article in the studio or the CMS, with its review state. */
export interface EditorArticle extends WrittenArticle {
  status: ReviewStatus;
  reviewNote: string | null;
  updatedAt: string;
  author: WrittenArticle['author'] & { id: string | null; fullName: string | null };
}

/** The cover as a loadable URL (uploads are served by the API). */
export const coverSrc = (url: string | null) => (url ? assetUrl(url) : null);
/** A section video as a loadable URL. */
export const videoSrc = (url: string): string => assetUrl(url);

export const toArticleInput = (a: EditorArticle): ArticleInput => ({
  title: a.title, description: a.description, category: a.category, coverImageUrl: a.coverImageUrl, takeaways: a.takeaways, sections: a.sections,
});

// ── Reading ───────────────────────────────────────────────────────────────────
export const fetchPublishedArticles = async (): Promise<WrittenArticle[]> => (await apiRequest('/articles/posts')).articles;
export const fetchPublishedArticle = async (slug: string): Promise<WrittenArticle> =>
  (await apiRequest(`/articles/posts/${encodeURIComponent(slug)}`)).article;

// ── Coach studio ──────────────────────────────────────────────────────────────
export const fetchMyArticles = async (): Promise<EditorArticle[]> => (await apiRequest('/creator/articles', { auth: true })).articles;
export const saveMyArticle = async (input: ArticleInput, slug: string | null): Promise<EditorArticle> => (await (slug
  ? apiRequest(`/creator/articles/${slug}`, { method: 'PUT', auth: true, body: input })
  : apiRequest('/creator/articles', { method: 'POST', auth: true, body: input }))).article;
export const submitMyArticle = (slug: string) => apiRequest(`/creator/articles/${slug}/submit`, { method: 'POST', auth: true });
export const deleteMyArticle = (slug: string) => apiRequest(`/creator/articles/${slug}`, { method: 'DELETE', auth: true });

/** Upload a cover picture; returns the URL to save in coverImageUrl. */
export async function uploadArticleCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('cover', file);
  return (await apiRequest('/creator/articles/cover', { method: 'POST', formData, auth: true })).url;
}

/** Upload a section video (MP4, WebM or MOV, up to 100 MB); returns the URL to save in the section's video. */
export async function uploadArticleVideo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('video', file);
  return (await apiRequest('/creator/articles/video', { method: 'POST', formData, auth: true })).url;
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const fetchAdminArticles = async (status?: ReviewStatus): Promise<EditorArticle[]> =>
  (await apiRequest('/admin/articles', { auth: true, query: { status } })).articles;
/** An admin's new article is published straight away unless `publish` is false. */
export const saveAdminArticle = async (input: ArticleInput, slug: string | null, publish = true): Promise<EditorArticle> => (await (slug
  ? apiRequest(`/admin/articles/${slug}`, { method: 'PUT', auth: true, body: input })
  : apiRequest('/admin/articles', { method: 'POST', auth: true, body: { ...input, publish } }))).article;
export const setArticleStatus = (slug: string, status: 'published' | 'rejected' | 'draft', reviewNote?: string) =>
  apiRequest(`/admin/articles/${slug}`, { method: 'PATCH', auth: true, body: { status, reviewNote } });
export const deleteArticle = (slug: string) => apiRequest(`/admin/articles/${slug}`, { method: 'DELETE', auth: true });
