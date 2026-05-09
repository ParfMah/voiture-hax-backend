/**
 * src/routes/credit.js
 * Routes API credito/finanziamento Hax-ISA
 * Utilizza il creditEngine per tutti i calcoli
 */
'use strict';

const { Router } = require('../app');
const creditEngine = require('../utils/creditEngine');
const { sendSuccess, sendError } = require('../utils/helpers');

const router = new Router();

// ============================================================
// POST /api/credit/simulate — Simulazione finanziamento
// ============================================================
router.post('/simulate', async (req, res) => {
  try {
    const { vehiclePrice, deposit, duration, rate } = req.body || {};

    // Parametri obbligatori
    if (vehiclePrice === undefined) {
      return sendError(res, 'Parametro vehiclePrice obbligatorio', 422);
    }
    if (deposit === undefined) {
      return sendError(res, 'Parametro deposit obbligatorio', 422);
    }

    // Usa il tasso di default se non specificato
    const effectiveRate = rate !== undefined
      ? parseFloat(rate)
      : creditEngine.CONFIG.DEFAULT_RATE;

    const effectiveDuration = duration !== undefined
      ? parseInt(duration, 10)
      : creditEngine.CONFIG.MIN_DURATION_MESI * 3; // 36 mesi default

    // Eseguire la simulazione
    const result = creditEngine.simula({
      vehiclePrice:  parseFloat(vehiclePrice),
      deposit:       parseFloat(deposit),
      duration:      effectiveDuration,
      rate:          effectiveRate,
    });

    if (!result.valid) {
      return sendError(res, 'Parametri non validi', 422, result.errors);
    }

    sendSuccess(res, result, 'Simulazione completata');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// POST /api/credit/plan — Piano di ammortamento completo
// ============================================================
router.post('/plan', async (req, res) => {
  try {
    const { vehiclePrice, deposit, duration, rate } = req.body || {};

    const sim = creditEngine.simula({
      vehiclePrice: parseFloat(vehiclePrice) || 0,
      deposit:      parseFloat(deposit)      || 0,
      duration:     parseInt(duration, 10)   || 36,
      rate:         parseFloat(rate)         || creditEngine.CONFIG.DEFAULT_RATE,
    });

    if (!sim.valid) {
      return sendError(res, 'Parametri non validi', 422, sim.errors);
    }

    const piano = creditEngine.generaPianoAmmortamento(
      sim.financed,
      sim.rate,
      sim.duration
    );

    sendSuccess(res, {
      simulazione: sim,
      piano,
      totalRate: piano.length,
    }, 'Piano di ammortamento generato');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// POST /api/credit/validate — Validazione richiesta credito
// ============================================================
router.post('/validate', async (req, res) => {
  try {
    const { simulation, customer } = req.body || {};

    if (!simulation) {
      return sendError(res, 'Dati simulazione obbligatori', 422);
    }

    const result = creditEngine.validaRichiestaCredito({ simulation, customer });

    if (!result.approved) {
      return sendError(res, 'Richiesta non approvabile', 422, result.errors);
    }

    sendSuccess(res, {
      approved: true,
      simulation: result.simulation,
      message: 'Richiesta credito valida — in attesa di approvazione formale',
    }, 'Richiesta validata');

  } catch (err) {
    sendError(res, err.message, 500);
  }
});

// ============================================================
// GET /api/credit/config — Parametri di configurazione
// ============================================================
router.get('/config', async (req, res) => {
  sendSuccess(res, {
    minRate:          creditEngine.CONFIG.MIN_RATE,
    maxRate:          creditEngine.CONFIG.MAX_RATE,
    defaultRate:      creditEngine.CONFIG.DEFAULT_RATE,
    minDuration:      creditEngine.CONFIG.MIN_DURATION_MESI,
    maxDuration:      creditEngine.CONFIG.MAX_DURATION_MESI,
    durationStep:     creditEngine.CONFIG.DURATION_STEP,
    minDepositPct:    creditEngine.CONFIG.MIN_DEPOSIT_PCT,
    durations:        [12, 24, 36, 48, 60, 72, 84],
  }, 'Configurazione credito');
});

module.exports = router;
