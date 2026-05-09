/**
 * src/server.js
 * Point d'entrée principal du serveur Hax-ISA
 * Initialise le serveur HTTP, MongoDB et tous les middlewares
 */

'use strict';

// Chargement des variables d'environnement (DOIT être en premier)
require('dotenv').config();

const http       = require('http');
const app        = require('./app');
const connectDB  = require('./config/database');
const { checkConfig: checkCloudinary } = require('./config/cloudinary');
const logger     = require('./utils/logger');

// ============================================================
// CONFIGURATION
// ============================================================
const PORT    = parseInt(process.env.PORT, 10) || 3000;
const HOST    = '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
async function startServer() {
  try {
    // 1. Connexion à MongoDB
    await connectDB();
    logger.info('✅ MongoDB connecté con successo');

    // 2b. Verificare configurazione Cloudinary
    checkCloudinary();

    // 2. Création du serveur HTTP
    const server = http.createServer(app);

    // 3. Écoute sur le port
    server.listen(PORT, HOST, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║          HAX-ISA Backend Server            ║
╠════════════════════════════════════════════╣
║  Ambiente  : ${NODE_ENV.padEnd(28)}║
║  URL       : http://localhost:${PORT}${' '.repeat(14)}║
║  API Base  : http://localhost:${PORT}/api${' '.repeat(9)}║
║  Docs      : http://localhost:${PORT}/api/health${' '.repeat(5)}║
╚════════════════════════════════════════════╝
      `);
    });

    // 4. Gestion des erreurs serveur
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`❌ Porta ${PORT} già in uso. Cambia PORT nel file .env`);
      } else {
        logger.error('❌ Errore server:', err);
      }
      process.exit(1);
    });

    // 5. Arrêt propre (SIGTERM / SIGINT)
    const gracefulShutdown = async (signal) => {
      logger.info(`\n📴 Segnale ${signal} ricevuto — Arresto in corso...`);
      server.close(async () => {
        try {
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          logger.info('✅ Connessione MongoDB chiusa');
          process.exit(0);
        } catch (err) {
          logger.error('❌ Errore durante l\'arresto:', err);
          process.exit(1);
        }
      });
      // Forcer l'arrêt après 10s
      setTimeout(() => {
        logger.error('⏱ Timeout arresto — Uscita forzata');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

    // 6. Gestion des erreurs non gérées
    process.on('unhandledRejection', (reason) => {
      logger.error('❌ Promessa non gestita:', reason);
      if (NODE_ENV === 'production') gracefulShutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err) => {
      logger.error('❌ Eccezione non catturata:', err);
      gracefulShutdown('uncaughtException');
    });

    return server;

  } catch (err) {
    logger.error('❌ Impossibile avviare il server:', err);
    process.exit(1);
  }
}

startServer();
