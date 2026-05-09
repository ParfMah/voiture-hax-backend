/**
 * src/config/database.js
 * Connexion MongoDB via Mongoose pour Hax-ISA
 */
'use strict';

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hax_isa';

// Options de connexion Mongoose
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS:          45000,
  connectTimeoutMS:         10000,
  maxPoolSize:              10,
  minPoolSize:              2,
  heartbeatFrequencyMS:     10000,
};

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(MONGODB_URI, MONGOOSE_OPTIONS);
    isConnected = true;

    logger.info(`📦 MongoDB: ${conn.connection.host}/${conn.connection.name}`);

    // Événements de connexion
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      logger.warn('⚠️  MongoDB disconnesso');
    });
    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      logger.info('✅ MongoDB riconnesso');
    });
    mongoose.connection.on('error', (err) => {
      logger.error('❌ Errore MongoDB:', err.message);
    });

  } catch (err) {
    logger.error('❌ Connessione MongoDB fallita:', err.message);
    logger.error('   Verifica che MongoDB sia avviato e che MONGODB_URI sia corretto nel file .env');
    throw err;
  }
}

// Déconnexion propre
async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  logger.info('📴 MongoDB disconnesso correttamente');
}

module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.getConnection = () => mongoose.connection;
