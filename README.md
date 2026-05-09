# 🚗 HAX-ISA Backend — API Server

**International Sale of Automobiles** — Backend Node.js + MongoDB

---

## 📋 Requisiti

- **Node.js** >= 18.0.0
- **MongoDB** >= 6.0 (locale o MongoDB Atlas)
- **npm** >= 9.0

---

## 🚀 Installazione e Avvio

### 1. Installa le dipendenze
```bash
cd backend
npm install
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env
# Modifica .env con i tuoi valori (MongoDB URI, JWT secret, ecc.)
```

### 3. Avvia MongoDB (se locale)
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 4. Popola il database con dati di esempio
```bash
npm run seed
```

### 5. Avvia il server
```bash
# Sviluppo (con auto-reload)
npm run dev

# Produzione
npm start
```

Il server sarà disponibile su: **http://localhost:3000**

---

## 📡 Endpoint API Principali

| Metodo | Endpoint                  | Descrizione                  |
|--------|--------------------------|------------------------------|
| GET    | /api/health              | Health check server          |
| GET    | /api/vehicles            | Lista veicoli (con filtri)   |
| GET    | /api/vehicles/featured   | Veicoli in evidenza          |
| GET    | /api/vehicles/:id        | Dettaglio veicolo            |
| POST   | /api/orders              | Crea nuovo ordine            |
| GET    | /api/orders              | Lista ordini (admin)         |
| POST   | /api/auth/login          | Login admin                  |
| GET    | /api/auth/me             | Profilo utente               |
| POST   | /api/credit/simulate     | Simulazione finanziamento    |
| GET    | /api/stats/dashboard     | Statistiche dashboard        |

---

## 🔐 Autenticazione

L'API utilizza **JWT Bearer Token**:
```
Authorization: Bearer <token>
```

Credenziali admin default (modificare subito dopo il primo avvio):
- Email: `admin@hax-isa.it`
- Password: `Admin@HAX2024!`

---

## 📁 Struttura Progetto

```
backend/
├── src/
│   ├── server.js          # Punto di ingresso
│   ├── app.js             # Router principale + middlewares
│   ├── config/
│   │   └── database.js    # Connessione MongoDB
│   ├── models/            # Schemi Mongoose (PARTE 10)
│   ├── controllers/       # Logica business (PARTE 11)
│   ├── routes/            # Definizione endpoint
│   ├── middleware/        # Auth, validazione (PARTE 14)
│   └── utils/
│       ├── logger.js      # Logger
│       ├── helpers.js     # Utilità
│       └── seed.js        # Dati di esempio (PARTE 9)
├── uploads/               # Immagini veicoli
├── logs/                  # Log applicazione
├── .env                   # Variabili d'ambiente (NON committare)
├── .env.example           # Template configurazione
└── package.json
```

---

## ⚙️ Variabili d'Ambiente

| Variabile            | Default                              | Descrizione             |
|---------------------|--------------------------------------|-------------------------|
| PORT                | 3000                                 | Porta server            |
| MONGODB_URI         | mongodb://localhost:27017/hax_isa    | URI MongoDB             |
| JWT_SECRET          | (richiesto)                          | Chiave JWT              |
| JWT_EXPIRES_IN      | 7d                                   | Scadenza token          |
| CORS_ORIGINS        | http://localhost:5500                | Origini CORS            |
| RATE_LIMIT_MAX_REQUESTS | 100                              | Max req per 15 min      |

---

## 🛡️ Sicurezza

- JWT con scadenza configurabile
- Password hashed con bcryptjs (salt rounds: 12)
- Rate limiting per IP
- Headers di sicurezza (CORS, X-Frame-Options, XSS-Protection)
- Validazione input lato server
- Sanitizzazione dati

---

*Hax-ISA Backend v1.0.0 — © 2024 Hax-ISA S.r.l.*
