/**
 * src/utils/helpers.js
 * Fonctions utilitaires backend Hax-ISA
 */
'use strict';

// Réponse API standardisée
const sendSuccess = (res, data = {}, message = 'OK', status = 200) =>
  res.json({ success: true, message, data }, status);

const sendError = (res, message = 'Errore', status = 400, errors = null) =>
  res.json({ success: false, message, ...(errors && { errors }) }, status);

// Pagination
function paginateQuery(query = {}) {
  const page    = Math.max(1, parseInt(query.page,  10) || 1);
  const limit   = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip    = (page - 1) * limit;
  return { page, limit, skip };
}

function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// Validation email
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Validation Codice Fiscale italiano
const isValidCodiceFiscale = (cf) =>
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST]{1}[0-9LMNPQRSTUV]{2}[A-Z]{1}[0-9LMNPQRSTUV]{3}[A-Z]{1}$/i.test(cf);

// Nettoyage des inputs (protection XSS basique)
const sanitize = (str) =>
  typeof str === 'string'
    ? str.trim().replace(/[<>]/g, '').slice(0, 1000)
    : str;

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = typeof v === 'string' ? sanitize(v) : v;
  }
  return result;
};

// Formatage prix en EUR
const formatPrice = (amount) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

// Générer un ID commande
const generateOrderId = () =>
  'HAX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

// Extraire les filtres MongoDB depuis les query params
function buildVehicleFilter(query) {
  const filter = {};
  if (query.tipo)       filter.tipo      = query.tipo;
  if (query.marca)      filter.marca     = new RegExp(query.marca, 'i');
  if (query.carburante) filter.carburante= query.carburante;
  if (query.categoria)  filter.categoria = query.categoria;
  if (query.disponibile !== undefined) filter.disponibile = query.disponibile === 'true';

  // Plage prix
  if (query.priceMin || query.priceMax) {
    filter.prezzo = {};
    if (query.priceMin) filter.prezzo.$gte = parseFloat(query.priceMin);
    if (query.priceMax) filter.prezzo.$lte = parseFloat(query.priceMax);
  }

  // Plage année
  if (query.annoMin || query.annoMax) {
    filter.anno = {};
    if (query.annoMin) filter.anno.$gte = parseInt(query.annoMin, 10);
    if (query.annoMax) filter.anno.$lte = parseInt(query.annoMax, 10);
  }

  // Plage km
  if (query.kmMax) filter.chilometri = { $lte: parseInt(query.kmMax, 10) };

  // Recherche texte
  if (query.q) {
    filter.$or = [
      { marca:    new RegExp(query.q, 'i') },
      { modello:  new RegExp(query.q, 'i') },
      { colore:   new RegExp(query.q, 'i') },
      { descrizione: new RegExp(query.q, 'i') },
    ];
  }

  return filter;
}

module.exports = {
  sendSuccess, sendError,
  paginateQuery, paginatedResponse,
  isValidEmail, isValidCodiceFiscale,
  sanitize, sanitizeObject,
  formatPrice, generateOrderId,
  buildVehicleFilter,
};
