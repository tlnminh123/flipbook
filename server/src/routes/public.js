import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { findPublishedById, findPublishedBySlug, getSiteSettings, listPublished } from '../repos/publications.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storageRoot = path.join(serverRoot, 'storage', 'publications');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function publicPublication(publication) {
  return {
    id: publication.id,
    slug: publication.slug,
    title: publication.title,
    subtitle: publication.subtitle,
    year: publication.year,
    description: publication.description,
    cover: publication.cover ? `/storage/publications/${publication.id}/${path.basename(publication.cover)}` : '',
    page_count: publication.page_count,
    author: publication.author,
    editor: publication.editor,
    language: publication.language,
    published_at: publication.published_at,
    reader_available: Boolean(publication.source_pdf || publication.pdf),
    permissions: {
      download: publication.allow_download,
      print: publication.allow_print,
      share: publication.allow_share,
    },
  };
}

function safePublicationFile(publication, relativePath, extensions) {
  if (!relativePath) return null;
  const basename = path.basename(relativePath);
  if (basename !== relativePath.replace(/\\/g, '/').split('/').pop()) return null;
  if (extensions && !extensions.has(path.extname(basename).toLowerCase())) return null;
  const directory = path.resolve(storageRoot, publication.id);
  const candidate = path.resolve(directory, basename);
  return candidate.startsWith(`${directory}${path.sep}`) ? candidate : null;
}

function sendPdf(res, file, disposition) {
  if (!file || !fs.existsSync(file)) return res.status(404).json({ error: 'Không tìm thấy tài liệu PDF.' });
  const signature = Buffer.alloc(5);
  const descriptor = fs.openSync(file, 'r');
  try { fs.readSync(descriptor, signature, 0, 5, 0); } finally { fs.closeSync(descriptor); }
  if (signature.toString('ascii') !== '%PDF-') return res.status(404).json({ error: 'Không tìm thấy tài liệu PDF.' });
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': disposition,
    'Cache-Control': 'private, max-age=300, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.sendFile(file);
}

const router = Router();
const storageRouter = Router();

router.get('/site', async (req, res, next) => {
  try { res.json(await getSiteSettings()); } catch (error) { next(error); }
});

router.get('/publications', async (req, res, next) => {
  try {
    const result = await listPublished(req.query);
    res.json({ ...result, items: result.items.map(publicPublication) });
  } catch (error) { next(error); }
});

router.get('/publications/:slug', async (req, res, next) => {
  try {
    const publication = await findPublishedBySlug(req.params.slug);
    if (!publication) return res.status(404).json({ error: 'Không tìm thấy ấn phẩm.' });
    return res.json(publicPublication(publication));
  } catch (error) { return next(error); }
});

router.get('/publications/:slug/pdf', async (req, res, next) => {
  try {
    const publication = await findPublishedBySlug(req.params.slug);
    if (!publication) return res.status(404).json({ error: 'Không tìm thấy ấn phẩm.' });
    return sendPdf(res, safePublicationFile(publication, publication.source_pdf || publication.pdf, new Set(['.pdf'])), 'inline');
  } catch (error) { return next(error); }
});

router.get('/publications/:slug/download', async (req, res, next) => {
  try {
    const publication = await findPublishedBySlug(req.params.slug);
    if (!publication) return res.status(404).json({ error: 'Không tìm thấy ấn phẩm.' });
    if (!publication.allow_download) return res.status(403).json({ error: 'Ấn phẩm này không cho phép tải xuống.' });
    const title = (publication.title || 'publication').replace(/[\\/:*?"<>|]/g, '_');
    return sendPdf(res, safePublicationFile(publication, publication.source_pdf || publication.pdf, new Set(['.pdf'])), `attachment; filename="${title}.pdf"`);
  } catch (error) { return next(error); }
});

router.get('/publications/:slug/print', async (req, res, next) => {
  try {
    const publication = await findPublishedBySlug(req.params.slug);
    if (!publication) return res.status(404).json({ error: 'Không tìm thấy ấn phẩm.' });
    if (!publication.allow_print) return res.status(403).json({ error: 'Ấn phẩm này không cho phép in.' });
    return sendPdf(res, safePublicationFile(publication, publication.source_pdf || publication.pdf, new Set(['.pdf'])), 'inline');
  } catch (error) { return next(error); }
});

storageRouter.get('/storage/publications/:id/:file', async (req, res, next) => {
  try {
    if (path.basename(req.params.file) !== req.params.file || !imageExtensions.has(path.extname(req.params.file).toLowerCase())) {
      return res.status(404).end();
    }
    const publication = await findPublishedById(req.params.id);
    if (!publication || path.basename(publication.cover) !== req.params.file) return res.status(404).end();
    const file = path.resolve(storageRoot, req.params.id, req.params.file);
    const directory = path.resolve(storageRoot, req.params.id);
    if (!file.startsWith(`${directory}${path.sep}`) || !fs.existsSync(file)) return res.status(404).end();
    return res.sendFile(file, { headers: { 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return next(error); }
});

export default router;
export { storageRouter };
