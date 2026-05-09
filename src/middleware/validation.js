/**
 * src/middleware/validation.js
 * Middleware de validation des données entrantes pour Hax-ISA
 */
'use strict';

const { sendError } = require('../utils/helpers');

// ============================================================
// VALIDATEURS GÉNÉRIQUES
// ============================================================

/**
 * Crée un middleware de validation à partir d'un schéma
 * @param {object} schema - { field: validatorFn | { fn, message } }
 * @returns middleware
 */
function validate(schema) {
  return async (req, res, next) => {
    const body   = req.body || {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const value   = body[field];
      const fn      = typeof rule === 'function' ? rule : rule.fn;
      const message = typeof rule === 'object' && rule.message
        ? rule.message
        : `Campo '${field}' non valido`;

      try {
        const result = await fn(value, body);
        if (result === false || (typeof result === 'string')) {
          errors.push(typeof result === 'string' ? result : message);
        }
      } catch (e) {
        errors.push(e.message || message);
      }
    }

    if (errors.length > 0) {
      return sendError(res, 'Dati non validi', 422, errors);
    }
    await next();
  };
}

// ============================================================
// RÈGLES DE VALIDATION RÉUTILISABLES
// ============================================================
const rules = {
  required:   (msg)  => (v) => (v !== undefined && v !== null && v !== '') || msg || 'Campo obbligatorio',
  minLength:  (n,msg)=> (v) => (!v || v.length >= n) || msg || `Minimo ${n} caratteri`,
  maxLength:  (n,msg)=> (v) => (!v || v.length <= n) || msg || `Massimo ${n} caratteri`,
  isEmail:    (msg)  => (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || msg || 'Email non valida',
  isNumber:   (msg)  => (v) => v === undefined || v === null || !isNaN(Number(v)) || msg || 'Deve essere un numero',
  min:        (n,msg)=> (v) => v === undefined || Number(v) >= n || msg || `Minimo ${n}`,
  max:        (n,msg)=> (v) => v === undefined || Number(v) <= n || msg || `Massimo ${n}`,
  isEnum:     (vals,msg)=>(v)=> !v || vals.includes(v) || msg || `Valori ammessi: ${vals.join(', ')}`,
  isMongoId:  (msg)  => (v) => !v || /^[0-9a-fA-F]{24}$/.test(v) || msg || 'ID MongoDB non valido',
};

// ============================================================
// SCHÉMAS DE VALIDATION PRÉDÉFINIS
// ============================================================

// Création d'un véhicule
const vehicleCreateSchema = {
  marca:      rules.required('Marca obbligatoria'),
  modello:    rules.required('Modello obbligatorio'),
  tipo:       rules.isEnum(['nuovo','usato'], 'Tipo deve essere nuovo o usato'),
  anno:       [rules.required('Anno obbligatorio'), rules.min(1900), rules.max(new Date().getFullYear()+2)],
  prezzo:     [rules.required('Prezzo obbligatorio'), rules.min(0,'Prezzo non può essere negativo')],
  carburante: rules.isEnum(['Benzina','Diesel','Ibrido','Elettrico','GPL','Metano']),
};

// Création d'un ordre
const orderCreateSchema = {
  vehicleId:   rules.required('ID veicolo obbligatorio'),
  paymentMode: rules.isEnum(['cash','credit'], 'Modalità deve essere cash o credit'),
  'customer.nome':    rules.required('Nome cliente obbligatorio'),
  'customer.cognome': rules.required('Cognome cliente obbligatorio'),
  'customer.email':   [rules.required('Email cliente obbligatoria'), rules.isEmail()],
  'customer.telefono':rules.required('Telefono cliente obbligatorio'),
};

// Login
const loginSchema = {
  email:    [rules.required('Email obbligatoria'), rules.isEmail()],
  password: rules.required('Password obbligatoria'),
};

// Simulazione credito
const creditSimSchema = {
  vehiclePrice: [rules.required('Prezzo veicolo obbligatorio'), rules.min(1000)],
  deposit:      [rules.required('Acconto obbligatorio'), rules.min(0)],
};

module.exports = { validate, rules, vehicleCreateSchema, orderCreateSchema, loginSchema, creditSimSchema };
