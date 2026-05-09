/**
 * src/models/Order.js
 * Modello Mongoose — Ordine/Richiesta acquisto Hax-ISA
 */
'use strict';

const { Schema, model, models } = require('mongoose');

// ============================================================
// SOTTO-SCHEMA DATI CREDITO
// ============================================================
const CreditoSchema = new Schema({
  deposit:       { type: Number, required: true, min: 0 },
  duration:      { type: Number, required: true, min: 12, max: 84 },
  rate:          { type: Number, required: true, min: 2.0, max: 3.5 },
  financed:      { type: Number, required: true, min: 0 },
  monthly:       { type: Number, required: true, min: 0 },
  totalCost:     { type: Number, required: true, min: 0 },
  totalInterest: { type: Number, min: 0 },
  isValid:       { type: Boolean, default: true },
}, { _id: false });

// ============================================================
// SOTTO-SCHEMA DATI CLIENTE (snapshot al momento dell'ordine)
// ============================================================
const ClienteSchema = new Schema({
  nome:             { type: String, required: true, trim: true },
  cognome:          { type: String, required: true, trim: true },
  email:            { type: String, required: true, trim: true, lowercase: true },
  telefono:         { type: String, required: true, trim: true },
  codiceFiscale:    { type: String, trim: true, uppercase: true },
  dataNascita:      { type: String },
  indirizzo:        { type: String, trim: true },
  cap:              { type: String, trim: true },
  citta:            { type: String, trim: true },
  provincia:        { type: String, trim: true },
  paese:            { type: String, trim: true, default: 'Italia' },
  consegnaIndirizzo:{ type: String, trim: true },
  consegnaCap:      { type: String, trim: true },
  consegnaCitta:    { type: String, trim: true },
  noteConsegna:     { type: String, trim: true, maxlength: 500 },
}, { _id: false });

// ============================================================
// SOTTO-SCHEMA STORICO STATO
// ============================================================
const StatoStoriaSchema = new Schema({
  stato:     { type: String, required: true },
  data:      { type: Date,   default: Date.now },
  nota:      { type: String, trim: true },
  operatore: { type: String, trim: true },
}, { _id: false });

// ============================================================
// SCHEMA PRINCIPALE ORDINE
// ============================================================
const OrderSchema = new Schema({

  // ID ordine leggibile
  orderId: {
    type: String,
    unique: true,
    default: () => 'HAX-' + Date.now().toString(36).toUpperCase() + '-' +
                   Math.random().toString(36).slice(2, 5).toUpperCase(),
  },

  // Riferimento veicolo (ID stringa o ObjectId)
  vehicleId: { type: String, required: [true, 'ID veicolo obbligatorio'] },

  // Snapshot del veicolo al momento dell'ordine
  vehicleSnapshot: {
    marca:   { type: String },
    modello: { type: String },
    anno:    { type: Number },
    prezzo:  { type: Number },
    tipo:    { type: String },
  },

  // Modalità pagamento
  paymentMode: {
    type: String,
    required: true,
    enum: { values: ['cash','credit'], message: 'Modalità deve essere cash o credit' },
  },

  // Dati finanziamento (solo se paymentMode === 'credit')
  credit: { type: CreditoSchema, default: null },

  // Dati cliente (snapshot)
  customer: { type: ClienteSchema, required: true },

  // Stato ordine
  stato: {
    type: String,
    enum: ['in_attesa','validata','rifiutata','in_lavorazione','consegnata','annullata'],
    default: 'in_attesa',
  },

  // Storico stati
  storicoStati: [StatoStoriaSchema],

  // Note interne (admin)
  noteInterne: { type: String, trim: true, maxlength: 2000 },

  // Riferimento utente (se registrato)
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

  // Importo totale (prezzo veicolo o costo totale credito)
  importoTotale: { type: Number, min: 0 },

}, {
  timestamps: true,
  toJSON:  { virtuals: true },
  toObject:{ virtuals: true },
});

// ============================================================
// INDICI
// ============================================================
OrderSchema.index({ orderId: 1 },    { unique: true });
OrderSchema.index({ vehicleId: 1 });
OrderSchema.index({ stato: 1 });
OrderSchema.index({ 'customer.email': 1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ createdAt: -1 });

// ============================================================
// MIDDLEWARE — Pre-save
// ============================================================
OrderSchema.pre('save', function(next) {
  // Aggiungere entry nello storico stati al cambio
  if (this.isModified('stato')) {
    this.storicoStati.push({
      stato:     this.stato,
      data:      new Date(),
      nota:      'Cambio stato automatico',
    });
  }
  next();
});

// ============================================================
// VIRTUELS
// ============================================================


OrderSchema.virtual('nomeCliente').get(function() {
  if (!this.customer) return '—';
  return `${this.customer.nome || ''} ${this.customer.cognome || ''}`.trim();
});

OrderSchema.virtual('indirizzoConsegnaCompleto').get(function() {
  const c = this.customer;
  if (!c) return '—';
  const ind = c.consegnaIndirizzo || c.indirizzo || '';
  const cap = c.consegnaCap      || c.cap       || '';
  const cit = c.consegnaCitta    || c.citta     || '';
  return [ind, cap, cit].filter(Boolean).join(', ') || '—';
});

OrderSchema.virtual('etichettaStato').get(function() {
  const labels = {
    in_attesa:     'In Attesa',
    validata:      'Validata',
    rifiutata:     'Rifiutata',
    in_lavorazione:'In Lavorazione',
    consegnata:    'Consegnata',
    annullata:     'Annullata',
  };
  return labels[this.stato] || this.stato;
});

OrderSchema.virtual('coloreBadge').get(function() {
  const colors = {
    in_attesa:     'warning',
    validata:      'success',
    rifiutata:     'danger',
    in_lavorazione:'info',
    consegnata:    'dark',
    annullata:     'danger',
  };
  return colors[this.stato] || 'default';
});

// ============================================================
// METODI D'ISTANZA
// ============================================================
OrderSchema.methods.cambiaStato = async function(nuovoStato, nota = '', operatore = 'sistema') {
  const statiValidi = ['in_attesa','validata','rifiutata','in_lavorazione','consegnata','annullata'];
  if (!statiValidi.includes(nuovoStato)) {
    throw new Error(`Stato non valido: ${nuovoStato}`);
  }
  this.stato = nuovoStato;
  this.storicoStati.push({ stato: nuovoStato, data: new Date(), nota, operatore });
  return this.save();
};

// ============================================================
// METODI STATICI
// ============================================================
OrderSchema.statics.listaPaginata = async function(opzioni = {}) {
  const { page = 1, limit = 20, stato, q } = opzioni;
  const skip  = (page - 1) * limit;
  const query = {};
  if (stato) query.stato = stato;
  if (q) query.$or = [
    { orderId:          new RegExp(q, 'i') },
    { 'customer.nome':  new RegExp(q, 'i') },
    { 'customer.cognome':new RegExp(q,'i') },
    { 'customer.email': new RegExp(q, 'i') },
  ];
  const [data, total] = await Promise.all([
    this.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);
  return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

OrderSchema.statics.statistiche = async function() {
  const stats = await this.aggregate([
    { $group: {
      _id:          '$stato',
      count:        { $sum: 1 },
      totaleValore: { $sum: '$importoTotale' },
    }},
  ]);
  const result = {};
  stats.forEach(s => { result[s._id] = { count: s.count, totaleValore: s.totaleValore || 0 }; });
  return result;
};

module.exports = models.Order || model('Order', OrderSchema);
