/**
 * src/utils/logger.js
 * Logger simple pour Hax-ISA (sans dépendances externes)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV  = process.env.NODE_ENV  || 'development';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', // Rouge
  warn:  '\x1b[33m', // Jaune
  info:  '\x1b[36m', // Cyan
  debug: '\x1b[35m', // Magenta
  reset: '\x1b[0m',
};

const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

function formatMessage(level, ...args) {
  const timestamp = new Date().toISOString();
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
  return { timestamp, level: level.toUpperCase(), msg };
}

function writeToFile(entry) {
  try {
    const date     = entry.timestamp.slice(0, 10);
    const logFile  = path.join(logsDir, `hax-isa-${date}.log`);
    const line     = `[${entry.timestamp}] [${entry.level}] ${entry.msg}\n`;
    fs.appendFileSync(logFile, line, 'utf8');
  } catch (e) { /* ignorer les erreurs d'écriture */ }
}

function log(level, ...args) {
  if (LEVELS[level] > LEVELS[LOG_LEVEL]) return;

  const { timestamp, msg } = formatMessage(level, ...args);
  const color = COLORS[level] || '';
  const reset = COLORS.reset;

  // Console colorée
  const timeStr = timestamp.slice(11, 23); // HH:mm:ss.mmm
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
    `${COLORS.reset}[${timeStr}] ${color}${level.toUpperCase().padEnd(5)}${reset} ${msg}`
  );

  // Écriture fichier en production
  if (NODE_ENV === 'production' || level === 'error') {
    writeToFile({ timestamp, level, msg });
  }
}

const logger = {
  error: (...a) => log('error', ...a),
  warn:  (...a) => log('warn',  ...a),
  info:  (...a) => log('info',  ...a),
  debug: (...a) => log('debug', ...a),
};

module.exports = logger;
