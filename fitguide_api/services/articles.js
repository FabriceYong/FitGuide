/**
 * Articles written by coaches and admins in the studio and the admin CMS,
 * shown on the home page of the website and the app next to FitGuide's
 * built-in guides. A coach's article is reviewed by an admin before it's
 * published; an admin can publish their own straight away.
 */
const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { schemas } = require('../schemas/catalog');
const { validate } = require('../schemas/records');
const { displayName } = require('../utils/names');

// Ids of the guides built into the website and app (features/dashboard/articles.ts),
// which share the /articles/<slug> address space.
const BUILT_IN_SLUGS = new Set(['progressive-overload', 'protein-timing', 'active-recovery']);
const EDITABLE = ['draft', 'rejected'];
const WORDS_PER_MINUTE = 220;

class ArticleError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'article';

/** Reading time from the words in the article, at least a minute. */
function readMinutes({ description, takeaways, sections }) {
  const text = [description, ...takeaways, ...sections.flatMap((s) => [s.heading, ...s.paragraphs, s.tip || ''])].join(' ');
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / WORDS_PER_MINUTE));
}

const author = { select: { id: true, name: true, coachProfile: { select: { status: true } } } };

/** What readers see: the author's short name and, for approved coaches, their profile. */
function toPublic(row) {
  const coachId = row.author?.coachProfile?.status === 'approved' ? row.author.id : null;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    coverImageUrl: row.coverImageUrl,
    takeaways: row.takeaways,
    sections: row.sections,
    readMinutes: row.readMinutes,
    publishedAt: row.publishedAt && row.publishedAt.toISOString(),
    author: { name: row.author ? displayName(row.author.name) : 'FitGuide', coachId },
  };
}

/** What the writer and admins see in the studio and CMS. */
const forEditor = (row) => ({
  ...toPublic(row),
  status: row.status,
  reviewNote: row.reviewNote,
  updatedAt: row.updatedAt.toISOString(),
  author: { ...toPublic(row).author, id: row.authorId, fullName: row.author?.name || null },
});

function check(input) {
  const data = validate(schemas.article, input);
  return { ...data, readMinutes: readMinutes(data) };
}

async function listPublished({ limit = 12 } = {}) {
  const rows = await prisma.article.findMany({
    where: { status: 'published' },
    include: { author },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
  return rows.map(toPublic);
}

async function getPublished(slug) {
  const row = await prisma.article.findFirst({ where: { slug: String(slug), status: 'published' }, include: { author } });
  return row && toPublic(row);
}

/** A new article: a draft, or published at once when an admin asks. */
async function create(input, { authorId, publish = false }) {
  const data = check(input);
  let slug = slugify(data.title);
  if (BUILT_IN_SLUGS.has(slug) || (await prisma.article.count({ where: { slug } }))) slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
  const row = await prisma.article.create({
    data: { ...data, slug, authorId, status: publish ? 'published' : 'draft', publishedAt: publish ? new Date() : null },
    include: { author },
  });
  return forEditor(row);
}

/** Change the text. `where` limits it (a coach can only edit their own drafts). */
async function update(where, input) {
  const existing = await prisma.article.findFirst({ where });
  if (!existing) throw new ArticleError('Article not found.', 404);
  const row = await prisma.article.update({ where: { id: existing.id }, data: check(input), include: { author } });
  return forEditor(row);
}

const mineEditable = (authorId, slug) => ({ slug: String(slug), authorId, status: { in: EDITABLE } });

async function listMine(authorId) {
  const rows = await prisma.article.findMany({ where: { authorId }, include: { author }, orderBy: { updatedAt: 'desc' } });
  return rows.map(forEditor);
}

async function updateMine(authorId, slug, input) {
  const existing = await prisma.article.findFirst({ where: { slug: String(slug), authorId } });
  if (!existing) throw new ArticleError('Article not found.', 404);
  if (!EDITABLE.includes(existing.status)) throw new ArticleError('Only drafts and articles sent back for changes can be edited.', 409);
  // Editing an article that was sent back makes it a draft again.
  const article = await update({ id: existing.id }, input);
  if (existing.status === 'rejected') await prisma.article.update({ where: { id: existing.id }, data: { status: 'draft' } });
  return { ...article, status: 'draft' };
}

async function submitMine(authorId, slug) {
  const { count } = await prisma.article.updateMany({ where: mineEditable(authorId, slug), data: { status: 'pending', reviewNote: null } });
  if (!count) throw new ArticleError('Only drafts and articles sent back for changes can be sent for review.', 409);
}

async function deleteMine(authorId, slug) {
  const existing = await prisma.article.findFirst({ where: { slug: String(slug), authorId } });
  if (!existing) throw new ArticleError('Article not found.', 404);
  if (existing.status === 'published') throw new ArticleError('Published articles can’t be deleted. Ask an admin to unpublish it.', 409);
  await prisma.article.delete({ where: { id: existing.id } });
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/** Everything except other people's private drafts, or one status. */
async function listForAdmin({ status, adminId }) {
  const where = status ? { status } : { OR: [{ NOT: { status: 'draft' } }, { authorId: adminId }] };
  const rows = await prisma.article.findMany({ where, include: { author }, orderBy: { updatedAt: 'desc' } });
  return rows.map(forEditor);
}

/** Publish, send back with a note, or take down (back to draft). */
async function setStatus(slug, { status, reviewNote }) {
  const existing = await prisma.article.findUnique({ where: { slug: String(slug) } });
  if (!existing) throw new ArticleError('Article not found.', 404);
  if (status === 'rejected' && !String(reviewNote || '').trim()) throw new ArticleError('Say what should change.');
  const row = await prisma.article.update({
    where: { id: existing.id },
    data: {
      status,
      reviewNote: status === 'rejected' ? String(reviewNote).trim().slice(0, 500) : null,
      publishedAt: status === 'published' ? existing.publishedAt || new Date() : status === 'draft' ? null : existing.publishedAt,
    },
    include: { author },
  });
  return forEditor(row);
}

async function remove(slug) {
  const { count } = await prisma.article.deleteMany({ where: { slug: String(slug) } });
  if (!count) throw new ArticleError('Article not found.', 404);
}

module.exports = {
  ArticleError,
  readMinutes,
  listPublished,
  getPublished,
  create,
  update,
  listMine,
  updateMine,
  submitMine,
  deleteMine,
  listForAdmin,
  setStatus,
  remove,
};
