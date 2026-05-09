/**
 * src/models/index.js
 * Export centralisé de tous les modèles Mongoose
 */
'use strict';

module.exports = {
  Vehicle: require('./Vehicle'),
  User:    require('./User'),
  Order:   require('./Order'),
  Content: require('./Content'),
};
