/**
 * src/models/Content.js
 * Modello Mongoose — Contenuto CMS Hax-ISA
 */
'use strict';

const { Schema, model, models } = require('mongoose');

const ContentSchema = new Schema({
  chiave:    { type: String, required: true, unique: true, trim: true, maxlength: 100 },
  titolo:    { type: String, required: true, trim: true, maxlength: 200 },
  corpo:     { type: String, required: true, maxlength: 10000 },
  tipo:      { type: String,
               enum: ['testo','testo_lungo','html','immagine','link','contatto','seo','numero'],
               default: 'testo' },
  attivo:    { type: Boolean, default: true },
  nota:      { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

ContentSchema.index({ chiave: 1 }, { unique: true });
ContentSchema.index({ tipo: 1 });

ContentSchema.statics.getByChiave = function(chiave) {
  return this.findOne({ chiave, attivo: true }).lean();
};

ContentSchema.statics.getAll = function() {
  return this.find({ attivo: true }).sort('chiave').lean();
};

module.exports = models.Content || model('Content', ContentSchema);
