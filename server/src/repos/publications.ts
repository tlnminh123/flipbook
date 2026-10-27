import { pool } from '../db/pool.js';
import { normalizeQuery } from '../lib/searchText.js';

const collator = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });
const columns = `id, slug, title, subtitle, year, description, cover, source_pdf, pdf,
  page_count, author, editor, language, allow_download, allow_print, allow_share,
  created_at, updated_at, published_at`;

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

function dateValue(publication) {
  return Date.parse(publication.published_at ?? publication.created_at ?? '') || 0;
}

function sortPublications(items, sort) {
  return items.sort((a, b) => {
    if (sort === 'title_asc') return collator.compare(a.title, b.title);
    if (sort === 'title_desc') return collator.compare(b.title, a.title);
    const result = sort === 'oldest' ? dateValue(a) - dateValue(b) : dateValue(b) - dateValue(a);
    return result || collator.compare(a.title, b.title);
  });
}

export function normalizeFilters(query) {
  const q = normalizeQuery(String(query.q ?? '').trim()).slice(0, 200);
  const requestedYear = Number.parseInt(String(query.year ?? ''), 10);
  const year = requestedYear >= 1900 && requestedYear <= 2200 ? requestedYear : null;
  const allowedSorts = new Set(['newest', 'oldest', 'title_asc', 'title_desc']);
  const sort = allowedSorts.has(query.sort) ? query.sort : 'newest';
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(String(query.per_page ?? '12'), 10) || 12));
  return { q, year, sort, page, perPage };
}

export async function listPublished(query) {
  const filters = normalizeFilters(query);
  const result = await pool.query(
    `SELECT ${columns} FROM publications
      WHERE status = 'published'
        AND ($1::integer IS NULL OR year = $1)
        AND search_text LIKE '%' || $2 || '%' ESCAPE '\\'`,
    [filters.year, escapeLike(filters.q)]
  );
  const items = sortPublications(result.rows, filters.sort);
  const years = [...new Set(result.rows.map((row) => row.year).filter((year) => year != null))]
    .sort((a, b) => b - a);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / filters.perPage));
  const page = Math.min(filters.page, totalPages);
  return {
    items: items.slice((page - 1) * filters.perPage, page * filters.perPage),
    years,
    pagination: {
      page,
      per_page: filters.perPage,
      total_items: totalItems,
      total_pages: totalPages,
      has_previous: page > 1,
      has_next: page < totalPages,
      previous_page: page > 1 ? page - 1 : null,
      next_page: page < totalPages ? page + 1 : null,
    },
  };
}

export async function findPublishedBySlug(slug) {
  const result = await pool.query(
    `SELECT ${columns} FROM publications WHERE slug = $1 AND status = 'published'`,
    [slug]
  );
  return result.rows[0] ?? null;
}

export async function findPublishedById(id) {
  const result = await pool.query(
    `SELECT ${columns} FROM publications WHERE id = $1 AND status = 'published'`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getSiteSettings() {
  const result = await pool.query(
    `SELECT key, value FROM settings WHERE key = ANY($1::text[])`,
    [['school.name', 'school.logo', 'platform.name', 'platform.description', 'platform.favicon']]
  );
  const settings = Object.fromEntries(result.rows.map(({ key, value }) => [key, value]));
  return {
    school: { name: settings['school.name'] ?? '', logo: settings['school.logo'] ?? '' },
    platform: {
      name: settings['platform.name'] ?? '',
      description: settings['platform.description'] ?? '',
      favicon: settings['platform.favicon'] ?? '',
    },
  };
}
