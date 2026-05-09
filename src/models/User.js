/**
 * src/models/User.js
 * Modello Mongoose — Utente Hax-ISA (Admin e Cliente)
 */
'use strict';

const { Schema, model, models } = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// ============================================================
// SCHEMA INDIRIZZO (riutilizzato)
// ============================================================
const IndirizzoSchema = new Schema({
  via:       { type: String, trim: true, maxlength: 200 },
  cap:       { type: String, trim: true, maxlength: 10 },
  citta:     { type: String, trim: true, maxlength: 100 },
  provincia: { type: String, trim: true, maxlength: 5 },
  paese:     { type: String, trim: true, maxlength: 60, default: 'Italia' },
}, { _id: false });

// ============================================================
// SCHEMA PRINCIPALE UTENTE
// ============================================================
const UserSchema = new Schema({

  // Dati anagrafici
  nome:          { type: String, required: [true,'Nome obbligatorio'], trim: true, maxlength: 60 },
  cognome:       { type: String, required: [true,'Cognome obbligatorio'], trim: true, maxlength: 60 },
  email:         { type: String, required: [true,'Email obbligatoria'],
                   trim: true, lowercase: true, maxlength: 200,
                   match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email non valida'],
                   unique: true },
  telefono:      { type: String, trim: true, maxlength: 30 },
  dataNascita:   { type: Date },
  codiceFiscale: { type: String, trim: true, uppercase: true, maxlength: 16,
                   match: [/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i,
                           'Codice fiscale non valido'] },

  // Autenticazione
  password:      { type: String, required: [true,'Password obbligatoria'], minlength: 8, select: false },

  // Ruolo e stato
  ruolo:         { type: String, enum: ['admin','cliente'], default: 'cliente' },
  attivo:        { type: Boolean, default: true },
  emailVerificata:{ type: Boolean, default: false },

  // Indirizzi
  indirizzoResidenza: IndirizzoSchema,
  indirizzoConsegna:  IndirizzoSchema,

  // Preferenze
  notificheEmail: { type: Boolean, default: true },
  lingua:         { type: String, enum: ['it','en','fr','de'], default: 'it' },

  // Token di reset password
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date,   select: false },

  // Refresh token JWT
  refreshToken: { type: String, select: false },

  // Metadati
  ultimoAccesso: { type: Date },
  ipRegistrazione: { type: String },

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Non esporre mai la password nei JSON
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.refreshToken;
      return ret;
    },
  },
});

// ============================================================
// INDICI
// ============================================================
UserSchema.index({ email: 1 },         { unique: true });
UserSchema.index({ ruolo: 1 });
UserSchema.index({ attivo: 1 });
UserSchema.index({ createdAt: -1 });

// ============================================================
// MIDDLEWARE — Hash password prima del salvataggio
// ============================================================
UserSchema.pre('save', async function(next) {
  // Hash solo se modificata
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

// ============================================================
// VIRTUELS
// ============================================================
UserSchema.virtual('nomeCompleto').get(function() {
  return `${this.nome} ${this.cognome}`.trim();
});

UserSchema.virtual('iniziali').get(function() {
  return ((this.nome?.[0] || '') + (this.cognome?.[0] || '')).toUpperCase();
});

// ============================================================
// METODI D'ISTANZA
// ============================================================

// Verifica password
UserSchema.methods.verificaPassword = async function(passwordInChiaro) {
  return bcrypt.compare(passwordInChiaro, this.password);
};

// Aggiorna ultimo accesso
UserSchema.methods.aggiornaUltimoAccesso = function() {
  this.ultimoAccesso = new Date();
  return this.save({ validateModifiedOnly: true });
};

// Controlla se l'utente è admin
UserSchema.methods.isAdmin = function() {
  return this.ruolo === 'admin';
};

// ============================================================
// METODI STATICI
// ============================================================

// Trova per email (con password — per login)
UserSchema.statics.trovaPerLogin = function(email) {
  return this.findOne({ email: email.toLowerCase().trim(), attivo: true })
             .select('+password +refreshToken');
};

// Lista paginata
UserSchema.statics.listaPaginata = async function(opzioni = {}) {
  const { page = 1, limit = 20, ruolo, q } = opzioni;
  const skip  = (page - 1) * limit;
  const query = {};
  if (ruolo) query.ruolo = ruolo;
  if (q)     query.$or   = [
    { nome:    new RegExp(q, 'i') },
    { cognome: new RegExp(q, 'i') },
    { email:   new RegExp(q, 'i') },
  ];
  const [data, total] = await Promise.all([
    this.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),
    this.countDocuments(query),
  ]);
  return { data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
};

module.exports = models.User || model('User', UserSchema);
