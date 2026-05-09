/**
 * src/utils/seed.js
 * Popola il database Hax-ISA con dati di esempio
 * Uso: npm run seed
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const logger    = require('./logger');

// ============================================================
// CONNESSIONE
// ============================================================
async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hax_isa';
  await mongoose.connect(uri);
  logger.info('MongoDB connesso per seed');
}

// ============================================================
// SCHEMI INLINE (per il seed, indipendenti dai model)
// ============================================================
const { Schema, model, models } = mongoose;

const UserSchema = new Schema({
  nome: String, cognome: String, email: { type: String, unique: true },
  password: String, ruolo: { type: String, enum: ['admin','cliente'], default: 'cliente' },
  attivo: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
const User = models.User || model('User', UserSchema);

const VehicleSchema = new Schema({
  marca: String, modello: String, tipo: String, anno: Number,
  chilometri: Number, prezzo: Number, prezzoOld: Number,
  carburante: String, cambio: String, potenza: String,
  cilindrata: String, colore: String, posti: Number, porte: Number,
  categoria: String, trazione: String, consumo: String,
  emissioni: String, peso: String, lunghezza: String,
  larghezza: String, velocita: String, accelerazione: String,
  descrizione: String, immagini: [String],
  equipaggiamento: Schema.Types.Mixed,
  storia: [{ data: String, titolo: String, desc: String }],
  disponibile: { type: Boolean, default: true },
  inEvidenza: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Vehicle = models.Vehicle || model('Vehicle', VehicleSchema);

const OrderSchema = new Schema({
  orderId: String, vehicleId: String,
  paymentMode: String, credit: Schema.Types.Mixed,
  customer: Schema.Types.Mixed, stato: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Order = models.Order || model('Order', OrderSchema);

const ContentSchema = new Schema({
  chiave: { type: String, unique: true },
  titolo: String, corpo: String, tipo: String,
  updatedAt: { type: Date, default: Date.now },
});
const Content = models.Content || model('Content', ContentSchema);

// ============================================================
// DATI UTENTI
// ============================================================
async function seedUsers() {
  const password_admin  = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@HAX2024!', 12);
  const password_cliente = await bcrypt.hash('Cliente@123', 12);

  const users = [
    {
      nome: 'Admin', cognome: 'Hax-ISA',
      email: process.env.ADMIN_EMAIL || 'admin@hax-isa.it',
      password: password_admin,
      ruolo: 'admin', attivo: true,
    },
    {
      nome: 'Mario', cognome: 'Rossi',
      email: 'mario.rossi@email.it',
      password: password_cliente,
      ruolo: 'cliente', attivo: true,
    },
    {
      nome: 'Sofia', cognome: 'Bianchi',
      email: 'sofia.bianchi@email.it',
      password: password_cliente,
      ruolo: 'cliente', attivo: true,
    },
    {
      nome: 'Luca', cognome: 'Ferrari',
      email: 'luca.ferrari@email.it',
      password: password_cliente,
      ruolo: 'cliente', attivo: true,
    },
  ];

  for (const u of users) {
    await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
  }
  logger.info(`  ✅ ${users.length} utenti creati/aggiornati`);
}

// ============================================================
// DATI VEICOLI
// ============================================================
async function seedVehicles() {
  const vehicles = [
    // ───── NUOVI ─────
    {
      marca:'BMW', modello:'Serie 5 520d xDrive M Sport',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:58900, prezzoOld:null,
      carburante:'Diesel', cambio:'Automatico',
      potenza:'190 CV', cilindrata:'1995 cc',
      colore:'Grigio Sophistograu', posti:5, porte:4,
      categoria:'berlina', trazione:'Integrale xDrive',
      consumo:'5.2 l/100km', emissioni:'137 g/km',
      peso:'1.715 kg', lunghezza:'4963 mm',
      larghezza:'1868 mm', velocita:'240 km/h',
      accelerazione:'7.1 sec 0-100',
      descrizione:'La BMW Serie 5 rappresenta l\'eccellenza nella categoria berlina premium. Motorizzazione diesel efficiente con trazione integrale xDrive e pacchetto M Sport completo. Interni in pelle Vernasca, BMW Live Cockpit Professional e Head-up Display di serie.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['BMW Driving Assistant Professional','Lane Keeping Assistant','ABS e ASC','Airbag frontali laterali e a tendina','Speed Limit Assist'],
        'Comfort':['Climatizzatore automatico bi-zona','Sedili anteriori riscaldabili elettricamente','Tetto apribile panoramico','Head-up display','Specchi ripiegabili elettricamente'],
        'Connettività':['BMW Live Cockpit Professional 12.3"','Apple CarPlay e Android Auto wireless','Navigazione connessa','Bluetooth A2DP','USB-C x4'],
        'Esterno':['Cerchi in lega 19" M Bicolor','Fari Full LED adattativi','Pacchetto esterno M Sport','Sensori parcheggio anteriori e posteriori'],
      },
      storia:[
        {data:'2024',titolo:'Prima immatricolazione',desc:'Veicolo nuovo di fabbrica'},
        {data:'Disponibile',titolo:'In magazzino',desc:'Pronto per consegna in 5 giorni'},
      ],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Mercedes-Benz', modello:'GLC 300 4MATIC AMG Line',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:72400, prezzoOld:null,
      carburante:'Benzina', cambio:'Automatico 9G-Tronic',
      potenza:'258 CV', cilindrata:'1999 cc',
      colore:'Bianco Polare', posti:5, porte:5,
      categoria:'suv', trazione:'4MATIC',
      consumo:'8.1 l/100km', emissioni:'183 g/km',
      peso:'1.920 kg', lunghezza:'4716 mm',
      larghezza:'1890 mm', velocita:'240 km/h',
      accelerazione:'6.2 sec 0-100',
      descrizione:'Il Mercedes GLC incarna la perfezione del segmento SUV premium. Il pacchetto AMG Line conferisce un aspetto sportivo e aggressivo, mentre la trazione 4MATIC garantisce sicurezza in ogni condizione climatica. Display MBUX di ultima generazione.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['PRE-SAFE Plus','Active Brake Assist','Blind Spot Assist','Attention Assist','Airbag a tendina'],
        'Comfort':['MBUX Display 11.9"','Sedili AMG in Artico/Dinamica','Clima bizona THERMOTRONIC','Tetto panoramico scorrevole','Keyless-Go'],
        'Connettività':['MBUX Navigation Plus','Apple CarPlay/Android Auto','Burmester 3D Surround Sound','USB-C x3'],
        'Esterno':['Cerchi AMG 20" bicolor','Fari Multibeam LED','Linea AMG esterna','Portellone elettrico mani libere'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Mai immatricolato'}],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Audi', modello:'Q7 55 TFSI quattro S line',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:91200, prezzoOld:null,
      carburante:'Benzina', cambio:'Tiptronic 8 rapporti',
      potenza:'340 CV', cilindrata:'2995 cc',
      colore:'Nero Mythos', posti:7, porte:5,
      categoria:'suv', trazione:'quattro AWD',
      consumo:'9.8 l/100km', emissioni:'224 g/km',
      peso:'2.105 kg', lunghezza:'5063 mm',
      larghezza:'1970 mm', velocita:'250 km/h',
      accelerazione:'5.9 sec 0-100',
      descrizione:'L\'Audi Q7 è l\'SUV di grande formato per eccellenza: 7 posti, trazione quattro, motore V6 da 340 CV e tecnologia MMI di ultima generazione. Il pacchetto S line aggiunge sportività senza compromettere il comfort di bordo.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Audi Pre Sense City e Basic','Tour Assist con ACC','Side Assist','7 airbag','Hill Descent Control'],
        'Comfort':['Virtual Cockpit Plus 12.3"','MMI Navigation Plus 10.1"','Sedili S line in pelle'],
        'Connettività':['MMI Navigation Plus','Apple CarPlay/Android Auto','Bang & Olufsen 3D Premium Sound'],
        'Esterno':['Cerchi S line 21"','Fari Matrix LED','Pacchetto esterno S line','Tetto panoramico apribile'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Disponibile per consegna immediata'}],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Toyota', modello:'RAV4 Hybrid GR Sport AWD',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:47500, prezzoOld:null,
      carburante:'Ibrido', cambio:'CVT e-Drive',
      potenza:'222 CV', cilindrata:'2487 cc',
      colore:'Blu Celestite', posti:5, porte:5,
      categoria:'suv', trazione:'AWD-i E-Four',
      consumo:'5.5 l/100km', emissioni:'126 g/km',
      peso:'1.840 kg', lunghezza:'4600 mm',
      larghezza:'1855 mm', velocita:'180 km/h',
      accelerazione:'8.1 sec 0-100',
      descrizione:'Il Toyota RAV4 Hybrid GR Sport combina l\'efficienza del sistema ibrido Toyota con il look sportivo GR. La trazione integrale elettrica AWD-i garantisce prestazioni ottimali su qualsiasi terreno senza consumare carburante extra.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Toyota Safety Sense 3.0','Pre-Collision System','Lane Departure Alert','Adaptive Cruise Control'],
        'Comfort':['Display 10.5" con navigazione','Sedili GR Sport riscaldabili','Clima tri-zona','HUD'],
        'Connettività':['Apple CarPlay/Android Auto','JBL Premium Audio','Wi-Fi Hotspot'],
        'Esterno':['Cerchi GR 18" neri','Fari Full LED','Barre tetto integrate'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Ibrido - nessuna tassa di immatricolazione'}],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Tesla', modello:'Model 3 Long Range AWD',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:54990, prezzoOld:null,
      carburante:'Elettrico', cambio:'Automatico a 1 rapporto',
      potenza:'358 CV', cilindrata:'—',
      colore:'Bianco Perla', posti:5, porte:4,
      categoria:'berlina', trazione:'AWD Dual Motor',
      consumo:'14.9 kWh/100km', emissioni:'0 g/km',
      peso:'1.830 kg', lunghezza:'4720 mm',
      larghezza:'1850 mm', velocita:'225 km/h',
      accelerazione:'4.4 sec 0-100',
      descrizione:'La Tesla Model 3 Long Range è la berlina elettrica di riferimento: autonomia di 629 km, ricarica Supercharger fino a 250 kW, Autopilot di serie e aggiornamenti OTA. Zero emissioni, zero compromessi.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Autopilot','8 telecamere','12 sensori a ultrasuoni','Rilevamento ostacoli'],
        'Comfort':['Schermo touch 15.4"','Sedili riscaldabili','Tetto in vetro panoramico','Audio Premium 14 speaker'],
        'Connettività':['Software Tesla OTA','Apple CarPlay/Android Auto','Netflix/YouTube integrati','Wi-Fi LTE'],
        'Esterno':['Cerchi aerodinamici 19"','Fari Full LED','Apertura porte elettrica'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Incentivi statali applicabili'}],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Volkswagen', modello:'Golf 8 GTI Clubsport',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:44900, prezzoOld:null,
      carburante:'Benzina', cambio:'DSG 7 rapporti',
      potenza:'300 CV', cilindrata:'1984 cc',
      colore:'Rosso Kings Red', posti:5, porte:5,
      categoria:'berlina', trazione:'Trazione anteriore',
      consumo:'7.8 l/100km', emissioni:'178 g/km',
      peso:'1.444 kg', lunghezza:'4284 mm',
      larghezza:'1789 mm', velocita:'250 km/h',
      accelerazione:'5.6 sec 0-100',
      descrizione:'La Golf GTI Clubsport è la versione più estrema della leggendaria hot-hatch. 300 CV, DSG a 7 rapporti, differenziale elettronico e impostazione del telaio specificatamente sviluppata per prestazioni da pista nell\'uso quotidiano.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Front Assist con frenata d\'emergenza','Lane Assist','ACC con Stop&Go'],
        'Comfort':['Virtual Cockpit Plus 10.25"','Discover Pro 10"','Sedili GTI riscaldabili'],
        'Connettività':['App-Connect wireless','Harman Kardon 300W','ID. Light'],
        'Esterno':['Cerchi Pretoria 19" nero lucido','Fari IQ.LIGHT LED Matrix','Tetto nero a contrasto'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Edizione Clubsport limitata'}],
      disponibile:true, inEvidenza:false,
    },
    // ───── USATI ─────
    {
      marca:'Audi', modello:'A4 35 TDI S line Competition',
      tipo:'usato', anno:2022, chilometri:38000,
      prezzo:34500, prezzoOld:38900,
      carburante:'Diesel', cambio:'S tronic 7 rapporti',
      potenza:'163 CV', cilindrata:'1968 cc',
      colore:'Nero Mythos', posti:5, porte:4,
      categoria:'berlina', trazione:'Trazione anteriore',
      consumo:'4.8 l/100km', emissioni:'127 g/km',
      peso:'1.480 kg', lunghezza:'4762 mm',
      larghezza:'1847 mm', velocita:'230 km/h',
      accelerazione:'8.1 sec 0-100',
      descrizione:'Audi A4 in versione S line Competition. Unico proprietario, manutenzione sempre effettuata presso Audi Service autorizzato. Condizioni eccellenti, nessuna riparazione carrozzeria. Include pneumatici invernali con cerchi.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Audi Pre Sense City','Lane Departure Warning','ACC adattativo Stop&Go'],
        'Comfort':['Virtual Cockpit Plus 12.3"','MMI Navigation Plus','Sedili in pelle Dakota riscaldabili'],
        'Connettività':['MMI Navigation Plus','Apple CarPlay','Audi Smartphone Interface'],
        'Esterno':['Cerchi S line 18"','Fari LED con luce diurna','Vetri posteriori oscurati'],
      },
      storia:[
        {data:'Mar 2022',titolo:'Prima immatricolazione',desc:'Acquistata nuova da privato, Milano'},
        {data:'Ott 2022',titolo:'Tagliando 15.000 km',desc:'Audi Service Milano — Rev. completa'},
        {data:'Apr 2023',titolo:'Tagliando 30.000 km',desc:'Audi Service Torino — Filtri e olio'},
        {data:'Nov 2023',titolo:'Revisione obbligatoria',desc:'Superata — Esito positivo'},
        {data:'Gen 2024',titolo:'Acquistata da Hax-ISA',desc:'Controllo 100 punti completato'},
      ],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Porsche', modello:'Cayenne 3.0 V6 Platinum Edition',
      tipo:'usato', anno:2021, chilometri:54000,
      prezzo:69800, prezzoOld:78000,
      carburante:'Benzina', cambio:'Tiptronic S 8 rapporti',
      potenza:'340 CV', cilindrata:'2995 cc',
      colore:'Bianco Carrara', posti:5, porte:5,
      categoria:'suv', trazione:'AWD Porsche Traction Management',
      consumo:'9.4 l/100km', emissioni:'214 g/km',
      peso:'2.060 kg', lunghezza:'4918 mm',
      larghezza:'1983 mm', velocita:'243 km/h',
      accelerazione:'6.2 sec 0-100',
      descrizione:'Porsche Cayenne in edizione Platinum con dotazione di serie molto ricca. Due proprietari, service book completo Porsche, sempre mantenuta in Porsche Centre Roma. Un SUV premium in condizioni immacolate a prezzo eccezionale.',
      immagini:[],
      equipaggiamento:{
        'Sicurezza':['Porsche InnoDrive','Lane Change Assist','Surround View','Night Vision Assist'],
        'Comfort':['Porsche Communication Management PCM','Sedili ventilati e riscaldati','Climatizzatore 4 zone','Tetto apribile panoramico'],
        'Connettività':['PCM con Apple CarPlay','BOSE Surround Sound 14 altoparlanti','Wi-Fi Hotspot'],
        'Esterno':['Cerchi Cayenne Design 21"','Fari LED Matrix','Air Suspension'],
      },
      storia:[
        {data:'Mar 2021',titolo:'Prima immatricolazione',desc:'Acquistata nuova, Roma'},
        {data:'Mar 2022',titolo:'Tagliando annuale',desc:'Porsche Centre Roma — 20.000 km'},
        {data:'Mar 2023',titolo:'Tagliando biennale',desc:'Porsche Centre Roma — 40.000 km'},
        {data:'Feb 2024',titolo:'Acquistata da Hax-ISA',desc:'Certificazione completata'},
      ],
      disponibile:true, inEvidenza:true,
    },
    {
      marca:'Volkswagen', modello:'Golf 8 GTI DSG',
      tipo:'usato', anno:2023, chilometri:12500,
      prezzo:39900, prezzoOld:43500,
      carburante:'Benzina', cambio:'DSG 7 rapporti',
      potenza:'245 CV', cilindrata:'1984 cc',
      colore:'Grigio Pyrit', posti:5, porte:5,
      categoria:'berlina', trazione:'Trazione anteriore',
      consumo:'7.5 l/100km', emissioni:'172 g/km',
      peso:'1.432 kg', lunghezza:'4284 mm',
      larghezza:'1789 mm', velocita:'250 km/h',
      accelerazione:'6.3 sec 0-100',
      descrizione:'Golf GTI quasi nuova: solo 12.500 km, garanzia Volkswagen ancora attiva. Acquistata come dimostrative dal dealer ufficiale. Condizioni perfette, come nuova, con tutti i tagliandi effettuati.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['Front Assist','Lane Assist','Side Assist'],
        'Comfort':['Virtual Cockpit','Discover Pro 10"','Sedili GTI'],
        'Connettività':['App-Connect','Harman Kardon'],
        'Esterno':['Cerchi GTI 18"','Fari LED'],
      },
      storia:[
        {data:'Lug 2023',titolo:'Prima immatricolazione',desc:'Auto dimostrativa Volkswagen'},
        {data:'Dic 2023',titolo:'Acquistata da Hax-ISA',desc:'Controllo 100 punti OK'},
      ],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'BMW', modello:'X5 xDrive40d M Sport',
      tipo:'usato', anno:2022, chilometri:28000,
      prezzo:74500, prezzoOld:82000,
      carburante:'Diesel', cambio:'Steptronic 8 rapporti',
      potenza:'340 CV', cilindrata:'2993 cc',
      colore:'Nero Saphir', posti:7, porte:5,
      categoria:'suv', trazione:'xDrive AWD',
      consumo:'7.2 l/100km', emissioni:'190 g/km',
      peso:'2.175 kg', lunghezza:'4922 mm',
      larghezza:'2004 mm', velocita:'250 km/h',
      accelerazione:'5.5 sec 0-100',
      descrizione:'BMW X5 7 posti in allestimento M Sport. Un unico proprietario aziendale, service book BMW completo, sempre servita in BMW Premium Selection. Ideale per famiglie numerose senza rinunciare a prestazioni sportive.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['BMW Driving Assistant Professional','Parking Assistant Plus','Surround View Camera'],
        'Comfort':['Sedili M Sport riscaldabili e ventilati','Climatizzatore 4 zone','Tetto panoramico Sky Lounge'],
        'Connettività':['BMW Live Cockpit Professional','Bowers & Wilkins Diamond Surround','Apple CarPlay/Android Auto'],
        'Esterno':['Cerchi M 21"','Fari adattativi LED','Sospensioni M Sport','Griglia M Sport'],
      },
      storia:[
        {data:'Feb 2022',titolo:'Prima immatricolazione',desc:'Flotta aziendale'},
        {data:'Feb 2023',titolo:'Tagliando 15.000 km',desc:'BMW Service — Perfetto stato'},
        {data:'Gen 2024',titolo:'Acquistata da Hax-ISA',desc:'Ispezione 100 punti superata'},
      ],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Alfa Romeo', modello:'Stelvio 2.0T Q4 Veloce',
      tipo:'usato', anno:2022, chilometri:31000,
      prezzo:46500, prezzoOld:52000,
      carburante:'Benzina', cambio:'Automatico 8AT',
      potenza:'280 CV', cilindrata:'1995 cc',
      colore:'Rosso Competizione', posti:5, porte:5,
      categoria:'suv', trazione:'Q4 AWD',
      consumo:'9.2 l/100km', emissioni:'210 g/km',
      peso:'1.660 kg', lunghezza:'4687 mm',
      larghezza:'1903 mm', velocita:'230 km/h',
      accelerazione:'5.7 sec 0-100',
      descrizione:'Alfa Romeo Stelvio Veloce nel colore icona Rosso Competizione. Due proprietari, sempre mantenuto in centri Alfa Romeo autorizzati. Il SUV italiano più sportivo sul mercato, in condizioni eccellenti.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['Forward Collision Warning','Lane Departure Warning','Blind Spot Detection'],
        'Comfort':['Display 8.8" con navigazione','Sedili Veloce in pelle Nappa riscaldabili','Clima bizona'],
        'Connettività':['Apple CarPlay/Android Auto','Harman Kardon Premium Audio'],
        'Esterno':['Cerchi 20" bicolore','Fari Full LED','Freni Brembo'],
      },
      storia:[
        {data:'Apr 2022',titolo:'Prima immatricolazione',desc:'Privato, Firenze'},
        {data:'Apr 2023',titolo:'Tagliando 15.000 km',desc:'Alfa Romeo Service'},
        {data:'Mar 2024',titolo:'Acquistata da Hax-ISA',desc:'Certificazione OK'},
      ],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Volvo', modello:'XC60 T6 AWD Recharge Inscription',
      tipo:'usato', anno:2022, chilometri:44000,
      prezzo:49900, prezzoOld:55000,
      carburante:'Ibrido', cambio:'Geartronic 8 rapporti',
      potenza:'310 CV', cilindrata:'1969 cc',
      colore:'Grigio Osmium', posti:5, porte:5,
      categoria:'suv', trazione:'AWD',
      consumo:'2.1 l/100km (WLTP)', emissioni:'48 g/km',
      peso:'2.040 kg', lunghezza:'4688 mm',
      larghezza:'1902 mm', velocita:'180 km/h',
      accelerazione:'5.5 sec 0-100',
      descrizione:'Volvo XC60 T6 ibrido plug-in: autonomia elettrica 45 km, consumo WLTP eccezionale. Acquistata come auto aziendale da società di leasing, sempre seguita da Volvo Service. Dotazione Inscription di alto livello.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['City Safety','Pilot Assist','Cross Traffic Alert','Run-off Road Protection'],
        'Comfort':['Sensus 9"','Sedili in pelle Nappa Ventilati','Clima 4 zone','Tetto panoramico'],
        'Connettività':['Apple CarPlay/Android Auto','Harman Kardon 600W Premium Sound'],
        'Esterno':['Cerchi 20" 5 doppie razze','Fari Thor LED','Air Suspension'],
      },
      storia:[
        {data:'Lug 2022',titolo:'Prima immatricolazione',desc:'Leasing aziendale'},
        {data:'Ago 2023',titolo:'Tagliando 30.000 km',desc:'Volvo Service — Ottimo stato'},
        {data:'Apr 2024',titolo:'Acquistata da Hax-ISA',desc:'100 punti certificati'},
      ],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Land Rover', modello:'Defender 110 D300 SE',
      tipo:'usato', anno:2022, chilometri:38500,
      prezzo:79500, prezzoOld:88000,
      carburante:'Diesel', cambio:'Automatico 8AT',
      potenza:'300 CV', cilindrata:'2996 cc',
      colore:'Verde Pangea', posti:7, porte:5,
      categoria:'suv', trazione:'AWD Terrain Response 2',
      consumo:'8.9 l/100km', emissioni:'234 g/km',
      peso:'2.353 kg', lunghezza:'5018 mm',
      larghezza:'2008 mm', velocita:'191 km/h',
      accelerazione:'7.7 sec 0-100',
      descrizione:'Land Rover Defender 110 7 posti, capace di affrontare qualsiasi terreno. Unico proprietario azienda, service Land Rover completo. Una delle versioni più ricercate: diesel potente, 7 posti reali, tecnologia Terrain Response 2.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['Emergency Braking','Blind Spot Assist','ClearSight Rear View Mirror'],
        'Comfort':['Pivi Pro 11.4"','Sedili SE riscaldabili','Tetto panoramico','AIR Suspension'],
        'Connettività':['Apple CarPlay/Android Auto','Meridian 400W Sound'],
        'Esterno':['Cerchi 20"','Fari Full LED','Portellone posteriore apribile lateralmente'],
      },
      storia:[
        {data:'Giu 2022',titolo:'Prima immatricolazione',desc:'Flotta aziendale outdoor'},
        {data:'Giu 2023',titolo:'Tagliando 20.000 km',desc:'Land Rover Service'},
        {data:'Mag 2024',titolo:'Acquistata da Hax-ISA',desc:'Certificazione 100 punti'},
      ],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Mercedes-Benz', modello:'A 200 AMG Line Premium',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:38900, prezzoOld:null,
      carburante:'Benzina', cambio:'DCT 7G-DCT',
      potenza:'163 CV', cilindrata:'1332 cc',
      colore:'Rosso Patagonia', posti:5, porte:5,
      categoria:'berlina', trazione:'Trazione anteriore',
      consumo:'6.7 l/100km', emissioni:'153 g/km',
      peso:'1.365 kg', lunghezza:'4419 mm',
      larghezza:'1796 mm', velocita:'230 km/h',
      accelerazione:'8.0 sec 0-100',
      descrizione:'Mercedes-Benz Classe A con pacchetto AMG Line Premium: l\'entry level della stella con anima sportiva. Display MBUX con sistema di controllo vocale Hey Mercedes, fari LED e personalizzazione AMG Line completa.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['Active Brake Assist','Attention Assist','Lane Keeping Assist'],
        'Comfort':['MBUX Widescreen 10.25" + 10.25"','Sedili AMG riscaldabili','Clima bizona'],
        'Connettività':['MBUX con Hey Mercedes','Apple CarPlay/Android Auto','USB-C x2'],
        'Esterno':['Cerchi AMG 18"','Fari LED high performance','Pacchetto AMG Line esterno'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Disponibile immediata'}],
      disponibile:true, inEvidenza:false,
    },
    {
      marca:'Hyundai', modello:'IONIQ 5 N AWD 650 CV',
      tipo:'nuovo', anno:2024, chilometri:0,
      prezzo:72900, prezzoOld:null,
      carburante:'Elettrico', cambio:'Automatico a 1 rapporto',
      potenza:'650 CV', cilindrata:'—',
      colore:'Bianco Mineral',posti:5, porte:5,
      categoria:'suv', trazione:'AWD Dual Motor',
      consumo:'21.0 kWh/100km', emissioni:'0 g/km',
      peso:'2.115 kg', lunghezza:'4635 mm',
      larghezza:'1890 mm', velocita:'260 km/h',
      accelerazione:'3.4 sec 0-100',
      descrizione:'L\'IONIQ 5 N è la berlina sportiva elettrica definitiva: 650 CV, 0-100 in 3.4 secondi, tecnologia N Grin Boost per sprint estremi. Suono motore simulato N Active Sound+, funzione N Drift Optimizer.',
      immagini:[], equipaggiamento:{
        'Sicurezza':['Highway Driving Assist 2','Forward Collision Avoidance','Blind-View Monitor'],
        'Comfort':['Display 12.3" + 12.3"','Sedili N con supporto laterale','Tetto panoramico','Audio Bose 12 speaker'],
        'Connettività':['Apple CarPlay/Android Auto wireless','Over-the-air updates','V2L Vehicle-to-Load'],
        'Esterno':['Cerchi N 21"','Pinze freno Brembo','Alettone posteriore attivo'],
      },
      storia:[{data:'2024',titolo:'Nuovo',desc:'Prenotazioni aperte'}],
      disponibile:true, inEvidenza:true,
    },
  ];

  for (const v of vehicles) {
    await Vehicle.findOneAndUpdate(
      { marca: v.marca, modello: v.modello, anno: v.anno },
      { ...v, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  }
  logger.info(`  ✅ ${vehicles.length} veicoli creati/aggiornati`);
  return vehicles.length;
}

// ============================================================
// DATI ORDINI DI ESEMPIO
// ============================================================
async function seedOrders() {
  const vehicles = await Vehicle.find().limit(3);
  if (!vehicles.length) return;

  const orders = [
    {
      orderId: 'HAX-2024-001',
      vehicleId: vehicles[0]?._id?.toString(),
      paymentMode: 'credit',
      credit: { deposit:11780, duration:36, rate:2.5, financed:47120, monthly:1362.80, totalCost:60790.80 },
      customer: { nome:'Marco', cognome:'Bianchi', email:'marco.bianchi@test.it', telefono:'+39 333 111 0001', codiceFiscale:'BNCMRC80A01H501U', indirizzo:'Via Verdi 10', cap:'20121', citta:'Milano', paese:'Italia' },
      stato: 'validata',
    },
    {
      orderId: 'HAX-2024-002',
      vehicleId: vehicles[1]?._id?.toString(),
      paymentMode: 'cash',
      credit: null,
      customer: { nome:'Sofia', cognome:'Romano', email:'sofia.romano@test.it', telefono:'+39 333 222 0002', codiceFiscale:'RMNSFR90B02L219V', indirizzo:'Via Napoli 5', cap:'00100', citta:'Roma', paese:'Italia' },
      stato: 'in_attesa',
    },
    {
      orderId: 'HAX-2024-003',
      vehicleId: vehicles[2]?._id?.toString(),
      paymentMode: 'credit',
      credit: { deposit:6900, duration:48, rate:3.0, financed:27600, monthly:611.40, totalCost:36247.20 },
      customer: { nome:'Luca', cognome:'Esposito', email:'luca.esposito@test.it', telefono:'+39 333 333 0003', codiceFiscale:'SPSLCU85C03F839X', indirizzo:'Via Roma 22', cap:'80100', citta:'Napoli', paese:'Italia' },
      stato: 'consegnata',
    },
  ];

  for (const o of orders) {
    await Order.findOneAndUpdate({ orderId: o.orderId }, { ...o, updatedAt: new Date() }, { upsert: true, new: true });
  }
  logger.info(`  ✅ ${orders.length} ordini di esempio creati`);
}

// ============================================================
// DATI CONTENUTO CMS
// ============================================================
async function seedContent() {
  const contents = [
    { chiave:'hero_title',    titolo:'Titolo Hero',    corpo:'Il Tuo Prossimo Sogno su Ruote Ti Aspetta', tipo:'testo' },
    { chiave:'hero_subtitle', titolo:'Sottotitolo Hero',corpo:'Scopri centinaia di veicoli nuovi e usati selezionati per te.',tipo:'testo'},
    { chiave:'about_title',   titolo:'Titolo Chi Siamo',corpo:'La Nostra Storia, Il Tuo Viaggio',tipo:'testo'},
    { chiave:'about_text',    titolo:'Testo Chi Siamo', corpo:'Fondata a Milano nel 2010, Hax-ISA è oggi uno dei più importanti dealer automobilistici internazionali d\'Europa.',tipo:'testo_lungo'},
    { chiave:'contact_phone', titolo:'Telefono',        corpo:'+39 02 1234 5678',tipo:'contatto'},
    { chiave:'contact_email', titolo:'Email',           corpo:'info@hax-isa.it',tipo:'contatto'},
    { chiave:'contact_address',titolo:'Indirizzo',      corpo:'Via Roma 42, 20121 Milano, Italia',tipo:'contatto'},
    { chiave:'footer_desc',   titolo:'Descrizione Footer',corpo:'La tua destinazione di fiducia per l\'acquisto di auto nuove e usate in Europa.',tipo:'testo'},
    { chiave:'meta_description',titolo:'Meta Description',corpo:'Hax-ISA — International Sale of Automobiles. Acquista la tua auto nuova o usata in Europa.',tipo:'seo'},
  ];

  for (const c of contents) {
    await Content.findOneAndUpdate({ chiave: c.chiave }, { ...c, updatedAt: new Date() }, { upsert: true, new: true });
  }
  logger.info(`  ✅ ${contents.length} contenuti CMS creati`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  logger.info('\n🌱 Avvio seed database Hax-ISA...\n');
  try {
    await connect();

    // Optionnel: vider les collections existantes
    const args = process.argv.slice(2);
    if (args.includes('--fresh')) {
      logger.info('🗑️  Reset collezioni...');
      await User.deleteMany({});
      await Vehicle.deleteMany({});
      await Order.deleteMany({});
      await Content.deleteMany({});
    }

    logger.info('👥 Creazione utenti...');
    await seedUsers();

    logger.info('🚗 Creazione veicoli...');
    const vCount = await seedVehicles();

    logger.info('📋 Creazione ordini...');
    await seedOrders();

    logger.info('📝 Creazione contenuti CMS...');
    await seedContent();

    logger.info(`
╔══════════════════════════════════════╗
║    ✅ Seed completato con successo!  ║
╠══════════════════════════════════════╣
║  Utenti    : 4 (1 admin + 3 clienti) ║
║  Veicoli   : ${String(vCount).padEnd(26)}║
║  Ordini    : 3 (demo)                ║
║  Contenuti : 9 chiavi CMS            ║
╠══════════════════════════════════════╣
║  Admin: admin@hax-isa.it             ║
║  Pass:  Admin@HAX2024!               ║
╚══════════════════════════════════════╝
    `);

  } catch (err) {
    logger.error('❌ Errore seed:', err.message);
    logger.error(err.stack);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

main();
