/**
 * src/controllers/ordersController.js
 * Logica métier ordini — notifiche e workflow
 */
'use strict';

const Order   = require('../models/Order');
const Vehicle = require('../models/Vehicle');
const logger  = require('../utils/logger');

// Workflow cambio stato con effetti collaterali
async function cambiaStatoOrdine(orderId, nuovoStato, nota, operatore) {
  let order = await Order.findOne({ orderId });
  if (!order) order = await Order.findById(orderId);
  if (!order) throw Object.assign(new Error('Ordine non trovato'), { statusCode: 404 });

  const vecchioStato = order.stato;
  await order.cambiaStato(nuovoStato, nota, operatore);

  // Effetti collaterali per stato
  if (nuovoStato === 'validata') {
    // Marcare il veicolo come non disponibile
    await Vehicle.findByIdAndUpdate(order.vehicleId, { disponibile: false }).catch(() => {});
    logger.info(`Ordine ${orderId}: veicolo ${order.vehicleId} marcato non disponibile`);
  }

  if (nuovoStato === 'annullata' || nuovoStato === 'rifiutata') {
    // Ripristinare disponibilità veicolo
    await Vehicle.findByIdAndUpdate(order.vehicleId, { disponibile: true }).catch(() => {});
    logger.info(`Ordine ${orderId}: veicolo ${order.vehicleId} ripristinato disponibile`);
  }

  logger.info(`Ordine ${orderId}: ${vecchioStato} → ${nuovoStato} (${operatore})`);
  return order;
}

// Statistiche mensili per dashboard
async function getStatisticheMensili(mesi = 12) {
  const data = await Order.aggregate([
    { $match: { createdAt: { $gte: new Date(Date.now() - mesi * 30 * 24 * 60 * 60 * 1000) } } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count:   { $sum: 1 },
        valore:  { $sum: '$importoTotale' },
        crediti: { $sum: { $cond: [{ $eq: ['$paymentMode','credit'] }, 1, 0] } },
        contanti:{ $sum: { $cond: [{ $eq: ['$paymentMode','cash'] }, 1, 0] } },
    }},
    { $sort: { _id: 1 } },
  ]);
  return data;
}

module.exports = { cambiaStatoOrdine, getStatisticheMensili };
