/**
 * src/models/Vehicle.js
 * Modello Mongoose — Veicolo Hax-ISA
 */
'use strict';

const { Schema, model, models } = require('mongoose');

// ============================================================
// SOTTO-SCHEMA STORIA VEICOLO
// ============================================================
const StoriaSchema = new Schema({
  data:   { type: String, required: true },
  titolo: { type: String, required: true },
  desc:   { type: String, default: '' },
}, { _id: false });

// ============================================================
// SCHEMA PRINCIPALE VEICOLO
// ============================================================
const VehicleSchema = new Schema({

  // Identificazione
  marca:    { type: String, required: [true,'Marca obbligatoria'],    trim: true, maxlength: 60 },
  modello:  { type: String, required: [true,'Modello obbligatorio'],  trim: true, maxlength: 120 },
  tipo:     { type: String, required: true,
              enum: { values: ['nuovo','usato'], message: 'Tipo deve essere nuovo o usato' } },

  // Dati tecnici
  anno:         { type: Number, required: true, min: 1900, max: new Date().getFullYear() + 2 },
  chilometri:   { type: Number, required: true, min: 0, default: 0 },
  carburante:   { type: String, required: true,
                  enum: ['Benzina','Diesel','Ibrido','Elettrico','GPL','Metano'] },
  cambio:       { type: String, required: true, trim: true, maxlength: 60 },
  potenza:      { type: String, trim: true, maxlength: 20 },
  cilindrata:   { type: String, trim: true, maxlength: 20 },
  trazione:     { type: String, trim: true, maxlength: 60 },
  posti:        { type: Number, min: 1, max: 12, default: 5 },
  porte:        { type: Number, min: 1, max: 6,  default: 5 },
  categoria:    { type: String, trim: true,
                  enum: ['berlina','suv','citycar','familiare','cabrio','sportiva','monovolume','furgone','altro'],
                  default: 'altro' },

  // Aspetto
  colore:       { type: String, trim: true, maxlength: 80 },

  // Prezzo
  prezzo:       { type: Number, required: [true,'Prezzo obbligatorio'], min: 0 },
  prezzoOld:    { type: Number, min: 0, default: null },

  // Ecologia
  consumo:      { type: String, trim: true, maxlength: 40 },
  emissioni:    { type: String, trim: true, maxlength: 40 },

  // Dimensioni e prestazioni
  peso:         { type: String, trim: true, maxlength: 30 },
  lunghezza:    { type: String, trim: true, maxlength: 30 },
  larghezza:    { type: String, trim: true, maxlength: 30 },
  velocita:     { type: String, trim: true, maxlength: 30 },
  accelerazione:{ type: String, trim: true, maxlength: 30 },

  // Contenuto editoriale
  descrizione:  { type: String, trim: true, maxlength: 3000, default: '' },
  immagini:     [{ type: String, trim: true }],

  // Equipaggiamento (oggetto libero: categoria -> array di stringhe)
  equipaggiamento: { type: Schema.Types.Mixed, default: {} },

  // Storia del veicolo (usato)
  storia: [StoriaSchema],

  // Stato
  disponibile:  { type: Boolean, default: true },
  inEvidenza:   { type: Boolean, default: false },

  // Metadati
  visite:       { type: Number, default: 0 },    // contatore visualizzazioni

}, {
  timestamps: true,   // createdAt + updatedAt automatici
  toJSON:     { virtuals: true },
  toObject:   { virtuals: true },
});

// ============================================================
// INDICI
// ============================================================
VehicleSchema.index({ marca: 1, modello: 1 });
VehicleSchema.index({ tipo: 1, disponibile: 1 });
VehicleSchema.index({ carburante: 1 });
VehicleSchema.index({ categoria: 1 });
VehicleSchema.index({ prezzo: 1 });
VehicleSchema.index({ anno: -1 });
VehicleSchema.index({ inEvidenza: 1, disponibile: 1 });
VehicleSchema.index({ createdAt: -1 });

// Recherche texte
VehicleSchema.index({
  marca: 'text', modello: 'text',
  descrizione: 'text', colore: 'text',
}, { name: 'vehicle_text_search', weights: { marca: 10, modello: 8, colore: 3, descrizione: 1 } });

// ============================================================
// VIRTUELS
// ============================================================

// Pourcentage de remise
VehicleSchema.virtual('sconto').get(function() {
  if (!this.prezzoOld || this.prezzoOld <= this.prezzo) return 0;
  return Math.round((1 - this.prezzo / this.prezzoOld) * 100);
});

// Mensualité indicative (20% apport, 36 mois, 2.5%)
VehicleSchema.virtual('mensileIndicativo').get(function() {
  const financed = this.prezzo * 0.80;
  const r        = 2.5 / 100 / 12;
  const factor   = Math.pow(1 + r, 36);
  return Math.round(financed * (r * factor) / (factor - 1));
});

// Première image ou placeholder
VehicleSchema.virtual('immagineCopertina').get(function() {
  return this.immagini?.[0] || '/assets/images/placeholder-car.svg';
});

// ============================================================
// MÉTHODES D'INSTANCE
// ============================================================

// Incrémenter les visites
VehicleSchema.methods.incrementaVisite = function() {
  this.visite = (this.visite || 0) + 1;
  return this.save();
};

// ============================================================
// MÉTHODES STATIQUES
// ============================================================

// Recherche paginée avec filtres
VehicleSchema.statics.cercaConFiltri = async function(filtri = {}, opzioni = {}) {
  const { page = 1, limit = 12, sort = '-createdAt' } = opzioni;
  const skip = (page - 1) * limit;

  const query = { disponibile: true };

  if (filtri.tipo)       query.tipo      = filtri.tipo;
  if (filtri.marca)      query.marca     = new RegExp(filtri.marca, 'i');
  if (filtri.carburante) query.carburante= filtri.carburante;
  if (filtri.categoria)  query.categoria = filtri.categoria;

  if (filtri.priceMin !== undefined || filtri.priceMax !== undefined) {
    query.prezzo = {};
    if (filtri.priceMin !== undefined) query.prezzo.$gte = parseFloat(filtri.priceMin);
    if (filtri.priceMax !== undefined) query.prezzo.$lte = parseFloat(filtri.priceMax);
  }
  if (filtri.annoMin !== undefined || filtri.annoMax !== undefined) {
    query.anno = {};
    if (filtri.annoMin !== undefined) query.anno.$gte = parseInt(filtri.annoMin, 10);
    if (filtri.annoMax !== undefined) query.anno.$lte = parseInt(filtri.annoMax, 10);
  }
  if (filtri.kmMax !== undefined) query.chilometri = { $lte: parseInt(filtri.kmMax, 10) };

  if (filtri.q) {
    query.$or = [
      { marca:    new RegExp(filtri.q, 'i') },
      { modello:  new RegExp(filtri.q, 'i') },
      { colore:   new RegExp(filtri.q, 'i') },
      { descrizione: new RegExp(filtri.q, 'i') },
    ];
  }

  const [data, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);

  return {
    data,
    pagination: {
      total, page, limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

// Veicoli simili
VehicleSchema.statics.trovaSimili = async function(vehicleId, limit = 4) {
  const v = await this.findById(vehicleId).lean();
  if (!v) return [];
  return this.find({
    _id:         { $ne: vehicleId },
    disponibile: true,
    $or: [
      { categoria: v.categoria },
      { marca:     v.marca },
      { prezzo:    { $gte: v.prezzo * 0.8, $lte: v.prezzo * 1.2 } },
    ],
  }).limit(limit).lean();
};

module.exports = models.Vehicle || model('Vehicle', VehicleSchema);
