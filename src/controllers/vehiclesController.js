/**
 * src/controllers/vehiclesController.js
 * Logique métier véhicules — séparation responsabilités
 */
'use strict';

const Vehicle = require('../models/Vehicle');
const { sendSuccess, sendError, paginateQuery } = require('../utils/helpers');

// Logique de création avec enrichissement
async function createVehicle(body) {
  const required = ['marca','modello','tipo','anno','prezzo','carburante','cambio'];
  const missing  = required.filter(f => !body[f]);
  if (missing.length) throw Object.assign(new Error(`Campi mancanti: ${missing.join(', ')}`), { statusCode: 422 });

  if (body.tipo === 'nuovo') body.chilometri = 0;

  // Calcolare mensile indicativo
  const financed = (body.prezzo || 0) * 0.80;
  const r        = 2.5 / 100 / 12;
  const factor   = Math.pow(1 + r, 36);
  body._mensileCalcolato = Math.round(financed * (r * factor) / (factor - 1));

  const vehicle = new Vehicle(body);
  return vehicle.save();
}

// Logica duplicazione veicolo
async function duplicateVehicle(id) {
  const original = await Vehicle.findById(id).lean();
  if (!original) throw Object.assign(new Error('Veicolo non trovato'), { statusCode: 404 });

  delete original._id;
  delete original.__v;
  delete original.createdAt;
  delete original.updatedAt;
  original.modello = `${original.modello} (Copia)`;
  original.disponibile = false;

  const copy = new Vehicle(original);
  return copy.save();
}

// Aggiornamento prezzi in bulk
async function aggiornaPrezziMultipli(updates) {
  // updates: [{ id, prezzo, prezzoOld }]
  if (!Array.isArray(updates) || !updates.length) {
    throw Object.assign(new Error('Array aggiornamenti vuoto'), { statusCode: 422 });
  }

  const results = await Promise.allSettled(
    updates.map(u =>
      Vehicle.findByIdAndUpdate(
        u.id,
        { prezzo: u.prezzo, prezzoOld: u.prezzoOld || null, updatedAt: new Date() },
        { new: true }
      )
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const failed    = results.filter(r => r.status === 'rejected' || !r.value).length;

  return { succeeded, failed, total: updates.length };
}

module.exports = { createVehicle, duplicateVehicle, aggiornaPrezziMultipli };
