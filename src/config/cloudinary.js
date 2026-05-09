/**
 * src/config/cloudinary.js
 * Configuration Cloudinary pour Hax-ISA
 * Gestion centralisée des uploads d'images véhicules
 */
'use strict';

const cloudinary   = require('cloudinary').v2;
const streamifier  = require('streamifier');
const logger       = require('../utils/logger');

// ============================================================
// CONFIGURATION
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,  // toujours HTTPS
});

// ============================================================
// VÉRIFICATION DE LA CONFIG AU DÉMARRAGE
// ============================================================
function checkConfig() {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    logger.warn(`⚠️  Cloudinary non configurato: variabili mancanti: ${missing.join(', ')}`);
    return false;
  }
  logger.info(`☁️  Cloudinary configurato: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  return true;
}

// ============================================================
// UPLOAD DEPUIS UN BUFFER (pas besoin de salvare su disco)
// ============================================================

/**
 * Carica un'immagine su Cloudinary da un Buffer in memoria
 * @param {Buffer} buffer       - Dati immagine
 * @param {object} options      - Opzioni upload
 * @param {string} options.folder      - Cartella Cloudinary (es. 'hax-isa/vehicles')
 * @param {string} options.publicId    - ID pubblico (opzionale, generato auto se omesso)
 * @param {number} options.width       - Larghezza max ridimensionamento
 * @param {number} options.height      - Altezza max ridimensionamento
 * @param {string} options.quality     - Qualità ('auto', '80', ecc.)
 * @returns {Promise<object>}   - Risultato Cloudinary con url, public_id, ecc.
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      folder    = 'hax-isa/vehicles',
      publicId  = null,
      width     = 1200,
      height    = 800,
      quality   = 'auto:good',
      format    = 'webp',
    } = options;

    const uploadOptions = {
      folder,
      resource_type: 'image',
      format,                          // convertire in WebP automaticamente
      quality,
      transformation: [
        {
          width, height,
          crop: 'fill',                // ritaglio intelligente
          gravity: 'auto',             // focus automatico
          fetch_format: 'auto',        // formato ottimale per il browser
          quality: 'auto',
        }
      ],
      ...(publicId && { public_id: publicId }),
    };

    // Creare uno stream dal buffer e uploadarlo
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Errore upload Cloudinary:', error.message);
          reject(new Error(`Upload fallito: ${error.message}`));
        } else {
          logger.info(`☁️  Immagine caricata: ${result.public_id} (${result.bytes} bytes)`);
          resolve(result);
        }
      }
    );

    // Pipe il buffer nello stream
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// ============================================================
// UPLOAD THUMBNAIL (immagine piccola per liste/card)
// ============================================================
function uploadThumbnail(buffer, folder = 'hax-isa/thumbnails') {
  return uploadBuffer(buffer, {
    folder,
    width:   400,
    height:  280,
    quality: 'auto:eco',
    format:  'webp',
  });
}

// ============================================================
// ELIMINAZIONE IMMAGINE
// ============================================================

/**
 * Elimina un'immagine da Cloudinary tramite public_id
 * @param {string} publicId - es. 'hax-isa/vehicles/vehicle-v01-abc123'
 */
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`🗑️  Immagine eliminata da Cloudinary: ${publicId} → ${result.result}`);
    return result;
  } catch (err) {
    logger.error('Errore eliminazione Cloudinary:', err.message);
    throw err;
  }
}

// ============================================================
// ELIMINAZIONE DI TUTTE LE IMMAGINI DI UN VEICOLO
// ============================================================
async function deleteVehicleImages(vehicleId) {
  try {
    // Elimina per prefisso cartella
    const result = await cloudinary.api.delete_resources_by_prefix(`hax-isa/vehicles/vehicle-${vehicleId}`);
    logger.info(`🗑️  Immagini veicolo ${vehicleId} eliminate: ${JSON.stringify(result.deleted)}`);
    return result;
  } catch (err) {
    logger.warn(`Impossibile eliminare immagini veicolo ${vehicleId}:`, err.message);
  }
}

// ============================================================
// HELPER: estrarre public_id da un URL Cloudinary
// ============================================================
function extractPublicId(cloudinaryUrl) {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) return null;
  // URL formato: https://res.cloudinary.com/CLOUD/image/upload/v1234/hax-isa/vehicles/abc.webp
  const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
}

// ============================================================
// GENERARE URL CON TRASFORMAZIONI AL VOLO
// ============================================================

/**
 * Genera un URL Cloudinary con trasformazioni personalizzate
 * Utile per generare thumbnail diverse dallo stesso originale
 */
function getTransformedUrl(publicId, transforms = {}) {
  const {
    width   = 800,
    height  = 600,
    crop    = 'fill',
    quality = 'auto',
    format  = 'webp',
  } = transforms;

  return cloudinary.url(publicId, {
    width, height, crop,
    quality, fetch_format: format,
    secure: true,
  });
}

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  cloudinary,
  checkConfig,
  uploadBuffer,
  uploadThumbnail,
  deleteImage,
  deleteVehicleImages,
  extractPublicId,
  getTransformedUrl,
};
