/**
 * src/utils/creditEngine.js
 * Motore finanziario Hax-ISA
 * Calcola mensualità, valida apporto, genera piano di ammortamento
 *
 * Formula mensualità (ammortamento francese):
 *   M = P × [r(1+r)^n] / [(1+r)^n − 1]
 *   P = capitale finanziato (prezzo - acconto)
 *   r = tasso mensile (TAN annuale / 12 / 100)
 *   n = durata in mesi
 */
'use strict';

// ============================================================
// CONFIGURAZIONE VINCOLI
// ============================================================
const CONFIG = Object.freeze({
  MIN_RATE:           2.0,    // TAN minimo %
  MAX_RATE:           3.5,    // TAN massimo %
  DEFAULT_RATE:       2.5,
  MIN_DURATION_MESI:  12,
  MAX_DURATION_MESI:  84,
  DURATION_STEP:      12,
  MIN_DEPOSIT_PCT:    10,     // % minimo acconto — BLOCCANTE
  MIN_VEHICLE_PRICE:  1000,
  MAX_VEHICLE_PRICE:  999999,
  ARROTONDAMENTO:     2,      // decimali
});

// ============================================================
// VALIDAZIONE INPUT
// ============================================================

/**
 * Valida tutti i parametri di simulazione
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validaInput({ vehiclePrice, deposit, duration, rate }) {
  const errors = [];

  // Prezzo veicolo
  const price = parseFloat(vehiclePrice);
  if (isNaN(price) || price < CONFIG.MIN_VEHICLE_PRICE) {
    errors.push(`Prezzo veicolo non valido (minimo €${CONFIG.MIN_VEHICLE_PRICE})`);
  } else if (price > CONFIG.MAX_VEHICLE_PRICE) {
    errors.push(`Prezzo veicolo troppo alto (massimo €${CONFIG.MAX_VEHICLE_PRICE})`);
  }

  // Acconto
  const dep = parseFloat(deposit);
  if (isNaN(dep) || dep < 0) {
    errors.push('Acconto non valido');
  } else if (!isNaN(price) && price >= CONFIG.MIN_VEHICLE_PRICE) {
    const minDeposit = price * (CONFIG.MIN_DEPOSIT_PCT / 100);
    if (dep < minDeposit) {
      errors.push(
        `Acconto insufficiente: minimo €${minDeposit.toFixed(2)} ` +
        `(${CONFIG.MIN_DEPOSIT_PCT}% di €${price.toFixed(2)})`
      );
    }
    if (dep >= price) {
      errors.push('L\'acconto non può essere uguale o maggiore del prezzo del veicolo');
    }
  }

  // Durata
  const dur = parseInt(duration, 10);
  if (isNaN(dur) || dur < CONFIG.MIN_DURATION_MESI || dur > CONFIG.MAX_DURATION_MESI) {
    errors.push(`Durata non valida (${CONFIG.MIN_DURATION_MESI}–${CONFIG.MAX_DURATION_MESI} mesi)`);
  } else if (dur % CONFIG.DURATION_STEP !== 0) {
    errors.push(`Durata deve essere multiplo di ${CONFIG.DURATION_STEP} mesi`);
  }

  // Tasso
  const r = parseFloat(rate);
  if (isNaN(r) || r < CONFIG.MIN_RATE || r > CONFIG.MAX_RATE) {
    errors.push(`Tasso non valido (${CONFIG.MIN_RATE}%–${CONFIG.MAX_RATE}%)`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// CALCOLO MENSUALITÀ
// ============================================================

/**
 * Calcola la rata mensile con formula di ammortamento francese
 * @param {number} principal - Capitale finanziato
 * @param {number} annualRate - Tasso annuale %
 * @param {number} months     - Durata mesi
 * @returns {number} Rata mensile arrotondata
 */
function calcolaMensile(principal, annualRate, months) {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  if (r === 0) return arrotonda(principal / months);
  const factor = Math.pow(1 + r, months);
  return arrotonda(principal * (r * factor) / (factor - 1));
}

function arrotonda(n, decimals = CONFIG.ARROTONDAMENTO) {
  return parseFloat(n.toFixed(decimals));
}

// ============================================================
// SIMULAZIONE COMPLETA
// ============================================================

/**
 * Esegue una simulazione finanziaria completa
 * @param {object} params
 * @returns {object} Risultato con tutte le voci
 */
function simula({ vehiclePrice, deposit, duration, rate }) {
  // Conversione e normalizzazione
  const price   = arrotonda(parseFloat(vehiclePrice) || 0);
  const dep     = arrotonda(parseFloat(deposit)      || 0);
  const dur     = parseInt(duration, 10) || CONFIG.MIN_DURATION_MESI;
  const r       = parseFloat(rate)       || CONFIG.DEFAULT_RATE;

  // Validazione
  const { valid, errors } = validaInput({ vehiclePrice: price, deposit: dep, duration: dur, rate: r });
  if (!valid) {
    return { valid: false, errors };
  }

  const minDeposit      = arrotonda(price * (CONFIG.MIN_DEPOSIT_PCT / 100));
  const depositPercent  = arrotonda((dep / price) * 100);
  const financed        = arrotonda(price - dep);
  const monthly         = calcolaMensile(financed, r, dur);
  const totalPayments   = arrotonda(monthly * dur);
  const totalInterest   = arrotonda(totalPayments - financed);
  const totalCost       = arrotonda(totalPayments + dep);
  const taeg            = calcolaTAEG(financed, monthly, dur);

  return {
    valid: true,
    errors: [],
    // Input normalizzati
    vehiclePrice:   price,
    deposit:        dep,
    duration:       dur,
    rate:           r,
    // Risultati calcolati
    minDeposit,
    depositPercent,
    financed,
    monthly,
    totalPayments,
    totalInterest,
    totalCost,
    taeg,
    // Riepilogo percentuali
    breakdown: {
      depositPct:   arrotonda((dep          / totalCost) * 100),
      financedPct:  arrotonda((financed      / totalCost) * 100),
      interestPct:  arrotonda((totalInterest / totalCost) * 100),
    },
  };
}

// ============================================================
// PIANO DI AMMORTAMENTO
// ============================================================

/**
 * Genera il piano di ammortamento mensile completo
 * @param {number} principal - Capitale finanziato
 * @param {number} annualRate - Tasso annuale %
 * @param {number} months    - Durata mesi
 * @returns {Array} Piano rata per rata
 */
function generaPianoAmmortamento(principal, annualRate, months) {
  const r       = annualRate / 100 / 12;
  const monthly = calcolaMensile(principal, annualRate, months);
  let balance   = principal;
  const piano   = [];

  for (let i = 1; i <= months; i++) {
    const interest   = arrotonda(balance * r);
    const principalP = arrotonda(monthly - interest);
    balance          = arrotonda(balance - principalP);

    // Correzione centesimi all'ultima rata
    const adjustedBalance = i === months ? 0 : Math.max(0, balance);

    piano.push({
      rata:          i,
      mensile:       monthly,
      capitale:      principalP,
      interessi:     interest,
      saldoResiduo:  adjustedBalance,
    });
  }

  return piano;
}

// ============================================================
// CALCOLO TAEG (approssimato con metodo Newton-Raphson)
// ============================================================

/**
 * Calcola il TAEG (Tasso Annuo Effettivo Globale)
 * Usa il metodo iterativo di Newton per trovare il tasso mensile
 * che eguaglia il VAN = 0
 */
function calcolaTAEG(principal, monthly, months) {
  let r = 0.025 / 12; // Stima iniziale

  for (let iter = 0; iter < 100; iter++) {
    const factor = Math.pow(1 + r, months);
    const pv     = monthly * (factor - 1) / (r * factor) - principal;
    const dpv    = monthly * (
      ((months * Math.pow(1 + r, months - 1) * r * factor) -
       (factor - 1) * (factor + r * months * Math.pow(1 + r, months - 1)))
    ) / Math.pow(r * factor, 2);

    const rNew = r - pv / dpv;
    if (Math.abs(rNew - r) < 1e-10) { r = rNew; break; }
    r = rNew;
  }

  return arrotonda(Math.pow(1 + r, 12) * 100 - 100);
}

// ============================================================
// VALIDAZIONE RICHIESTA CREDITO
// ============================================================

/**
 * Valida una richiesta di credito per l'approvazione
 * Controlla la coerenza dei dati del cliente
 */
function validaRichiestaCredito({ simulation, customer }) {
  const errors = [];

  if (!simulation?.valid) {
    errors.push('Simulazione non valida o assente');
    return { approved: false, errors };
  }

  // Controlli cliente base
  if (!customer?.nome?.trim())    errors.push('Nome obbligatorio');
  if (!customer?.cognome?.trim()) errors.push('Cognome obbligatorio');

  // Validazione email
  if (!customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.push('Email non valida');
  }

  // Validazione CF italiano
  const cfRegex = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
  if (customer?.codiceFiscale && !cfRegex.test(customer.codiceFiscale)) {
    errors.push('Codice fiscale non valido');
  }

  // Controllo età (minimo 18 anni per finanziamento)
  if (customer?.dataNascita) {
    const dob  = new Date(customer.dataNascita);
    const age  = Math.floor((Date.now() - dob) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) errors.push('Il richiedente deve avere almeno 18 anni');
    if (age > 90) errors.push('Età non plausibile');
  }

  // Controllo importo minimo/massimo finanziabile
  const { financed } = simulation;
  if (financed < 1000) errors.push('Importo finanziato troppo basso (minimo €1.000)');
  if (financed > 500000) errors.push('Importo finanziato troppo alto (massimo €500.000)');

  return {
    approved: errors.length === 0,
    errors,
    simulation,
  };
}

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  CONFIG,
  validaInput,
  calcolaMensile,
  simula,
  generaPianoAmmortamento,
  calcolaTAEG,
  validaRichiestaCredito,
};
