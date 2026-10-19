/**
 * Read-only catalog content (exercises, programs) identified by slug.
 * Like the workout catalog, it is served from the MongoDB collection once that
 * has been seeded, and from the seed file in mock mode or while it is empty.
 */
const isMock = () => process.env.MOCK_DB === 'true';

function createCatalogStore(Model, seedData, { mongoFilter = {} } = {}) {
  const fromSeed = (item) => ({ id: item.slug, ...item });

  async function useSeedData() {
    if (isMock()) return true;
    return (await Model.estimatedDocumentCount()) === 0;
  }

  async function all() {
    if (await useSeedData()) return seedData.map(fromSeed);
    const docs = await Model.find(mongoFilter).sort({ createdAt: 1 });
    return docs.map((d) => d.toPublicObject());
  }

  async function getBySlug(slug) {
    if (await useSeedData()) {
      const item = seedData.find((s) => s.slug === slug);
      return item ? fromSeed(item) : null;
    }
    const doc = await Model.findOne({ ...mongoFilter, slug: String(slug) });
    return doc ? doc.toPublicObject() : null;
  }

  return { all, getBySlug };
}

module.exports = { createCatalogStore };
