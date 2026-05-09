/**
 * src/routes/upload.js
 * Routes upload immagini veicoli — intégration Cloudinary
 * Supporta: multipart/form-data, application/octet-stream
 */
'use strict';

const { Router }    = require('../app');
const Vehicle       = require('../models/Vehicle');
const { uploadBuffer, uploadThumbnail, deleteImage, extractPublicId } = require('../config/cloudinary');
const { sendSuccess, sendError } = require('../utils/helpers');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const logger        = require('../utils/logger');

const router = new Router();

const MAX_SIZE_BYTES  = (parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10) * 1024 * 1024;
const ALLOWED_MIME    = (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/webp').split(',');

// ============================================================
// LECTURE DU BODY MULTIPART/OCTET-STREAM
// ============================================================
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_SIZE_BYTES) {
        reject(new Error(`File troppo grande (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)`));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end',   () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Parser multipart semplificato — estrae file e mime type
function parseMultipartBuffer(req) {
  return new Promise((resolve, reject) => {
    const ct       = req.headers['content-type'] || '';
    const boundary = ct.split('boundary=')[1];
    if (!boundary) return reject(new Error('Boundary multipart non trovato'));

    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_SIZE_BYTES) {
        reject(new Error(`File troppo grande (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)`));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw     = Buffer.concat(chunks);
        const rawStr  = raw.toString('binary');

        // Trovare Content-Type nel multipart
        const ctMatch = rawStr.match(/Content-Type:\s*([^\r\n]+)/i);
        const mimeType = ctMatch ? ctMatch[1].trim() : 'image/jpeg';

        if (!ALLOWED_MIME.includes(mimeType)) {
          return reject(new Error(`Tipo non consentito: ${mimeType}. Permessi: ${ALLOWED_MIME.join(', ')}`));
        }

        // Estrarre il buffer del file (dopo \r\n\r\n e prima del boundary finale)
        const headerEnd  = rawStr.indexOf('\r\n\r\n') + 4;
        const footerMark = `\r\n--${boundary}`;
        const footerIdx  = rawStr.lastIndexOf(footerMark);
        const fileBuffer = raw.slice(headerEnd, footerIdx > 0 ? footerIdx : raw.length);

        resolve({ buffer: fileBuffer, mimeType });
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// ============================================================
// POST /api/upload/vehicles/:id/image
// Upload principale immagine veicolo su Cloudinary
// ============================================================
router.post('/vehicles/:id/image', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Verificare che il veicolo esiste
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);

    const ct = req.headers['content-type'] || '';
    let fileBuffer, mimeType;

    if (ct.includes('multipart/form-data')) {
      ({ buffer: fileBuffer, mimeType } = await parseMultipartBuffer(req));
    } else if (ct.includes('application/octet-stream') || ct.includes('image/')) {
      mimeType   = ct.split(';')[0].trim();
      fileBuffer = await readRawBody(req);
      if (!ALLOWED_MIME.includes(mimeType)) {
        return sendError(res, `Tipo file non consentito. Permessi: ${ALLOWED_MIME.join(', ')}`, 415);
      }
    } else {
      return sendError(res, 'Formato non supportato. Usa multipart/form-data o application/octet-stream', 415);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return sendError(res, 'File vuoto o non ricevuto', 400);
    }

    // Numero immagine corrente (per nominare il file)
    const imgIndex = (vehicle.immagini || []).length;

    // Upload su Cloudinary — cartella organizzata per ID veicolo
    const result = await uploadBuffer(fileBuffer, {
      folder:   `hax-isa/vehicles/${req.params.id}`,
      publicId: `img-${imgIndex}-${Date.now()}`,
      width:    1200,
      height:   800,
    });

    // Aggiungere l'URL sicuro all'array immagini del veicolo
    vehicle.immagini = vehicle.immagini || [];
    vehicle.immagini.push(result.secure_url);
    vehicle.updatedAt = new Date();
    await vehicle.save();

    logger.info(`Immagine aggiunta al veicolo ${req.params.id}: ${result.secure_url}`);

    sendSuccess(res, {
      url:        result.secure_url,
      public_id:  result.public_id,
      width:      result.width,
      height:     result.height,
      bytes:      result.bytes,
      format:     result.format,
      totalImages: vehicle.immagini.length,
    }, 'Immagine caricata su Cloudinary', 201);

  } catch (err) {
    logger.error('Errore upload immagine:', err);
    sendError(res, err.message, 500);
  }
});

// ============================================================
// POST /api/upload/vehicles/:id/images/multiple
// Upload multiplo (fino a 10 immagini)
// ============================================================
router.post('/vehicles/:id/images/multiple', requireAuth, requireAdmin, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);

    // Il body contiene un JSON array di base64
    const body = req.body || {};
    if (!body.images || !Array.isArray(body.images)) {
      return sendError(res, 'Campo images (array base64) obbligatorio', 422);
    }
    if (body.images.length > 10) {
      return sendError(res, 'Massimo 10 immagini per volta', 422);
    }

    const uploaded = [];
    for (let i = 0; i < body.images.length; i++) {
      const { data, mimeType = 'image/jpeg' } = body.images[i];
      if (!data) continue;

      // Decodificare base64
      const buffer = Buffer.from(data, 'base64');
      if (buffer.length > MAX_SIZE_BYTES) {
        return sendError(res, `Immagine ${i+1} troppo grande`, 413);
      }

      const result = await uploadBuffer(buffer, {
        folder:   `hax-isa/vehicles/${req.params.id}`,
        publicId: `img-${(vehicle.immagini||[]).length + i}-${Date.now()}`,
      });
      uploaded.push(result.secure_url);
    }

    vehicle.immagini = [...(vehicle.immagini || []), ...uploaded];
    vehicle.updatedAt = new Date();
    await vehicle.save();

    sendSuccess(res, {
      uploaded: uploaded.length,
      urls:     uploaded,
      totalImages: vehicle.immagini.length,
    }, `${uploaded.length} immagini caricate`, 201);

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// DELETE /api/upload/vehicles/:id/image
// Elimina un'immagine da Cloudinary e dal veicolo
// ============================================================
router.delete('/vehicles/:id/image', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { imageUrl } = req.body || {};
    if (!imageUrl) return sendError(res, 'imageUrl obbligatorio nel body', 422);

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);

    // Estrarre il public_id dall'URL Cloudinary
    const publicId = extractPublicId(imageUrl);
    if (publicId) {
      await deleteImage(publicId).catch(e => logger.warn('Eliminazione Cloudinary fallita:', e.message));
    }

    // Rimuovere dall'array del veicolo
    vehicle.immagini  = (vehicle.immagini || []).filter(img => img !== imageUrl);
    vehicle.updatedAt = new Date();
    await vehicle.save();

    sendSuccess(res, {
      removed:     imageUrl,
      totalImages: vehicle.immagini.length,
    }, 'Immagine eliminata');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// PUT /api/upload/vehicles/:id/images/reorder
// Riordina le immagini del veicolo
// ============================================================
router.put('/vehicles/:id/images/reorder', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { images } = req.body || {};
    if (!Array.isArray(images)) return sendError(res, 'Array images obbligatorio', 422);

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);

    // Verificare che le URL coincidano (stesso set, ordine diverso)
    const currentSet = new Set(vehicle.immagini || []);
    const allValid   = images.every(url => currentSet.has(url));
    if (!allValid) return sendError(res, 'Alcune URL non appartengono a questo veicolo', 422);

    vehicle.immagini  = images;
    vehicle.updatedAt = new Date();
    await vehicle.save();

    sendSuccess(res, { images: vehicle.immagini }, 'Ordine immagini aggiornato');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/upload/vehicles/:id/images
// Lista immagini di un veicolo
// ============================================================
router.get('/vehicles/:id/images', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).select('immagini').lean();
    if (!vehicle) return sendError(res, 'Veicolo non trovato', 404);
    sendSuccess(res, { images: vehicle.immagini || [], total: (vehicle.immagini || []).length }, 'Immagini veicolo');
  } catch (err) {
    sendError(res, err.message, 500);
  }
});

module.exports = router;
