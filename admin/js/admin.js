/**
 * admin/js/admin.js
 * Application CMS Admin Hax-ISA — Vanilla JS complet
 * Dashboard, Veicoli, Ordini, Utenti, Contenuti
 */
'use strict';

const AdminApp = (() => {

  // ============================================================
  // CONFIGURAZIONE
  // ============================================================
  const API_BASE  = 'http://localhost:3000/api';
  const DEMO_MODE = true; // true = funziona senza backend

  // ============================================================
  // STATO APPLICAZIONE
  // ============================================================
  const state = {
    token:       localStorage.getItem('haxisa_admin_token') || null,
    user:        JSON.parse(localStorage.getItem('haxisa_admin_user') || 'null'),
    currentPage: 'dashboard',
    data: {
      vehicles: [], orders: [], users: [], content: [], stats: null,
    },
    pagination: { vehicles:1, orders:1, users:1 },
    filters:    { vehicles:{}, orders:{}, users:{} },
  };

  // ============================================================
  // DATI DEMO
  // ============================================================
  const DEMO = {
    stats: {
      kpi: {
        totaleVeicoli:12, veicoliDisponibili:10, veicoliNuovi:6, veicoliUsati:6,
        totaleOrdini:47, ordiniInAttesa:8, ordiniValidati:31, ordiniConsegnati:18,
        totaleUtenti:124, utentiClienti:120, valoreOrdini:2847600, veicoli30gg:5,
      },
      trendOrdini: [
        {data:'2024-12-01',count:2},{data:'2024-12-02',count:5},{data:'2024-12-03',count:3},
        {data:'2024-12-04',count:7},{data:'2024-12-05',count:4},{data:'2024-12-06',count:6},{data:'2024-12-07',count:8},
      ],
      topMarche:[
        {_id:'BMW',count:12},{_id:'Mercedes',count:9},{_id:'Audi',count:8},
        {_id:'Volkswagen',count:7},{_id:'Toyota',count:5},
      ],
      ordiniPerStato:{
        in_attesa:{count:8,totaleValore:320000},
        validata:{count:31,totaleValore:1890000},
        consegnata:{count:18,totaleValore:957600},
        rifiutata:{count:2,totaleValore:0},
      },
    },
    vehicles:[
      {_id:'v01',marca:'BMW',modello:'Serie 5 520d',tipo:'nuovo',anno:2024,chilometri:0,prezzo:58900,carburante:'Diesel',disponibile:true,inEvidenza:true,createdAt:new Date().toISOString()},
      {_id:'v02',marca:'Mercedes',modello:'GLC 300 4MATIC',tipo:'nuovo',anno:2024,chilometri:0,prezzo:72400,carburante:'Benzina',disponibile:true,inEvidenza:true,createdAt:new Date().toISOString()},
      {_id:'v03',marca:'Audi',modello:'A4 35 TDI S line',tipo:'usato',anno:2022,chilometri:38000,prezzo:34500,carburante:'Diesel',disponibile:true,inEvidenza:false,createdAt:new Date().toISOString()},
      {_id:'v04',marca:'Volkswagen',modello:'Golf 8 GTI',tipo:'usato',anno:2023,chilometri:12500,prezzo:39900,carburante:'Benzina',disponibile:true,inEvidenza:false,createdAt:new Date().toISOString()},
      {_id:'v05',marca:'Toyota',modello:'RAV4 Hybrid',tipo:'nuovo',anno:2024,chilometri:0,prezzo:47500,carburante:'Ibrido',disponibile:true,inEvidenza:true,createdAt:new Date().toISOString()},
      {_id:'v06',marca:'Porsche',modello:'Cayenne 3.0 V6',tipo:'usato',anno:2021,chilometri:54000,prezzo:69800,carburante:'Benzina',disponibile:false,inEvidenza:false,createdAt:new Date().toISOString()},
    ],
    orders:[
      {_id:'o01',orderId:'HAX-2024-001',stato:'validata',paymentMode:'credit',importoTotale:60790,createdAt:'2024-12-01T10:00:00Z',customer:{nome:'Marco',cognome:'Bianchi',email:'marco@test.it'},vehicleSnapshot:{marca:'BMW',modello:'Serie 5'}},
      {_id:'o02',orderId:'HAX-2024-002',stato:'in_attesa',paymentMode:'cash',importoTotale:72400,createdAt:'2024-12-02T14:30:00Z',customer:{nome:'Sofia',cognome:'Romano',email:'sofia@test.it'},vehicleSnapshot:{marca:'Mercedes',modello:'GLC 300'}},
      {_id:'o03',orderId:'HAX-2024-003',stato:'consegnata',paymentMode:'credit',importoTotale:36247,createdAt:'2024-11-20T09:15:00Z',customer:{nome:'Luca',cognome:'Esposito',email:'luca@test.it'},vehicleSnapshot:{marca:'Audi',modello:'A4'}},
      {_id:'o04',orderId:'HAX-2024-004',stato:'rifiutata',paymentMode:'cash',importoTotale:39900,createdAt:'2024-11-18T16:45:00Z',customer:{nome:'Anna',cognome:'Conti',email:'anna@test.it'},vehicleSnapshot:{marca:'VW',modello:'Golf GTI'}},
      {_id:'o05',orderId:'HAX-2024-005',stato:'in_attesa',paymentMode:'credit',importoTotale:50120,createdAt:'2024-12-05T11:20:00Z',customer:{nome:'Paolo',cognome:'Mori',email:'paolo@test.it'},vehicleSnapshot:{marca:'Toyota',modello:'RAV4'}},
    ],
    users:[
      {_id:'u01',nome:'Admin',cognome:'Hax-ISA',email:'admin@hax-isa.it',ruolo:'admin',attivo:true,createdAt:'2024-01-01T00:00:00Z'},
      {_id:'u02',nome:'Mario',cognome:'Rossi',email:'mario@test.it',ruolo:'cliente',attivo:true,createdAt:'2024-11-15T00:00:00Z'},
      {_id:'u03',nome:'Sofia',cognome:'Romano',email:'sofia@test.it',ruolo:'cliente',attivo:true,createdAt:'2024-11-20T00:00:00Z'},
      {_id:'u04',nome:'Luca',cognome:'Ferrari',email:'luca@test.it',ruolo:'cliente',attivo:false,createdAt:'2024-10-05T00:00:00Z'},
    ],
    content:[
      {chiave:'hero_title',titolo:'Titolo Hero',corpo:'Il Tuo Prossimo Sogno su Ruote Ti Aspetta',tipo:'testo'},
      {chiave:'hero_subtitle',titolo:'Sottotitolo Hero',corpo:'Scopri centinaia di veicoli nuovi e usati.',tipo:'testo'},
      {chiave:'about_text',titolo:'Testo Chi Siamo',corpo:'Fondata a Milano nel 2010...',tipo:'testo_lungo'},
      {chiave:'contact_phone',titolo:'Telefono',corpo:'+39 02 1234 5678',tipo:'contatto'},
      {chiave:'contact_email',titolo:'Email',corpo:'info@hax-isa.it',tipo:'contatto'},
      {chiave:'footer_desc',titolo:'Descrizione Footer',corpo:'La tua destinazione di fiducia...',tipo:'testo'},
    ],
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const fmt = {
    price: (n) => n != null ? new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n) : '—',
    date:  (d) => d ? new Date(d).toLocaleDateString('it-IT') : '—',
    km:    (n) => n != null ? new Intl.NumberFormat('it-IT').format(n)+' km' : '—',
    trunc: (s,n=30) => s && s.length>n ? s.slice(0,n)+'…' : (s||'—'),
  };

  function el(id) { return document.getElementById(id); }

  function setLoading(html = '<div class="cms-loader"><div class="cms-spinner"></div><p>Caricamento...</p></div>') {
    el('cms-content').innerHTML = html;
  }

  // ============================================================
  // API
  // ============================================================
  async function apiCall(method, endpoint, body = null) {
    if (DEMO_MODE && !state.token) return null;
    try {
      const opts = {
        method,
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${state.token}` },
      };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(`${API_BASE}${endpoint}`, opts);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (e) {
      return null;
    }
  }

  // ============================================================
  // TOAST
  // ============================================================
  function toast(msg, type = 'info') {
    const c    = el('cms-toast-container');
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const t    = document.createElement('div');
    t.className = `cms-toast cms-toast--${type}`;
    t.innerHTML = `<span style="font-size:16px">${icons[type]||'🔔'}</span>
      <span class="cms-toast__msg">${msg}</span>
      <span class="cms-toast__close" onclick="this.parentElement.remove()">✕</span>`;
    c.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350); }, 4000);
  }

  // ============================================================
  // MODAL
  // ============================================================
  function openModal(title, bodyHtml, footerHtml = '') {
    el('cms-modal-title').textContent = title;
    el('cms-modal-body').innerHTML    = bodyHtml;
    el('cms-modal-footer').innerHTML  = footerHtml;
    el('cms-modal').style.display     = 'flex';
  }
  function closeModal() { el('cms-modal').style.display = 'none'; }

  // ============================================================
  // AUTH
  // ============================================================
  function login() {
    const email = el('login-email').value.trim();
    const pwd   = el('login-password').value;
    el('login-error').style.display = 'none';

    if (!email || !pwd) {
      showLoginError('Inserisci email e password');
      return;
    }

    // Credenziali demo hardcoded per il CMS
    const validCredentials = [
      { email:'admin@hax-isa.it', password:'Admin@HAX2024!' },
      { email:'admin@test.it',    password:'admin123' },
    ];

    const match = validCredentials.find(c => c.email === email && c.password === pwd);
    if (!match) {
      // Tentare con l'API reale
      apiCall('POST', '/auth/login', { email, password: pwd }).then(data => {
        if (data?.token) {
          completeLogin(data.token, data.user || { nome:'Admin', email });
        } else {
          showLoginError('Credenziali non valide');
        }
      });
      return;
    }

    // Login demo riuscito
    const demoToken = 'demo-token-' + Date.now();
    const demoUser  = { nome:'Admin', cognome:'Hax-ISA', email, ruolo:'admin' };
    completeLogin(demoToken, demoUser);
  }

  function completeLogin(token, user) {
    state.token = token;
    state.user  = user;
    localStorage.setItem('haxisa_admin_token', token);
    localStorage.setItem('haxisa_admin_user',  JSON.stringify(user));
    el('login-overlay').style.display = 'none';
    el('cms-layout').style.display    = 'flex';
    // Aggiornare UI utente
    el('user-name').textContent   = `${user.nome || ''} ${user.cognome || ''}`.trim();
    el('user-avatar').textContent = ((user.nome||'A')[0] + (user.cognome||'')[0]).toUpperCase() || 'A';
    navigate('dashboard');
    checkApiStatus();
  }

  function showLoginError(msg) {
    const e = el('login-error');
    e.textContent    = msg;
    e.style.display  = 'block';
  }

  function togglePassword() {
    const i = el('login-password');
    i.type  = i.type === 'password' ? 'text' : 'password';
  }

  function logout() {
    state.token = null; state.user = null;
    localStorage.removeItem('haxisa_admin_token');
    localStorage.removeItem('haxisa_admin_user');
    el('cms-layout').style.display    = 'none';
    el('login-overlay').style.display = 'flex';
  }

  async function checkApiStatus() {
    try {
      const r   = await fetch(`${API_BASE}/health`);
      const dot = document.querySelector('.api-dot');
      const txt = el('api-status-text');
      if (r.ok) {
        dot?.classList.remove('offline');
        if (txt) txt.textContent = 'API Online';
      } else throw new Error();
    } catch {
      const dot = document.querySelector('.api-dot');
      const txt = el('api-status-text');
      dot?.classList.add('offline');
      if (txt) txt.textContent = 'API Offline (Demo)';
    }
  }

  // ============================================================
  // NAVIGAZIONE
  // ============================================================
  function navigate(page) {
    state.currentPage = page;
    // Aggiornare sidebar
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === page);
    });
    // Aggiornare titolo topbar
    const titles = { dashboard:'Dashboard', vehicles:'Veicoli', orders:'Ordini', users:'Utenti', content:'Contenuti CMS' };
    el('topbar-title').textContent = titles[page] || page;
    // Chiudere sidebar mobile
    el('cms-sidebar').classList.remove('open');
    setLoading();
    // Rendering
    const renderers = { dashboard:renderDashboard, vehicles:renderVehicles, orders:renderOrders, users:renderUsers, content:renderContent };
    (renderers[page] || renderDashboard)();
  }

  function toggleSidebar() {
    el('cms-sidebar').classList.toggle('open');
  }

  function refresh() {
    const btn = document.querySelector('.topbar-refresh');
    btn?.classList.add('spinning');
    setTimeout(() => { btn?.classList.remove('spinning'); navigate(state.currentPage); }, 600);
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  async function renderDashboard() {
    const stats = DEMO_MODE ? DEMO.stats : (await apiCall('GET','/stats/dashboard') || DEMO.stats);
    state.data.stats = stats;
    const k = stats.kpi;

    // Badge ordini in attesa
    const badge = el('badge-orders');
    if (badge && k.ordiniInAttesa > 0) {
      badge.textContent = k.ordiniInAttesa;
      badge.classList.add('visible');
    }

    const maxCount = Math.max(...(stats.topMarche||[]).map(m=>m.count), 1);
    const barChart = (stats.topMarche||[]).map(m => `
      <div class="mini-bar-row">
        <span class="mini-bar-label">${m._id}</span>
        <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${(m.count/maxCount*100).toFixed(0)}%"></div></div>
        <span class="mini-bar-value">${m.count}</span>
      </div>`).join('');

    const maxTrend = Math.max(...(stats.trendOrdini||[]).map(t=>t.count), 1);
    const trendBars = (stats.trendOrdini||[]).map(t => {
      const h = Math.round((t.count / maxTrend) * 100);
      return `<div class="trend-bar" style="height:${Math.max(h,4)}%" title="${t.data}: ${t.count} ordini"></div>`;
    }).join('');

    const ordiniRecenti = (DEMO_MODE ? DEMO.orders : state.data.orders).slice(0,5);

    el('cms-content').innerHTML = `
      <div class="kpi-grid">
        ${[
          {icon:'🚗',bg:'var(--primary-bg)',label:'Veicoli Totali',value:k.totaleVeicoli,delta:`${k.veicoliDisponibili} disponibili`},
          {icon:'📋',bg:'var(--warning-bg)',label:'Ordini Totali',value:k.totaleOrdini,delta:`${k.ordiniInAttesa} in attesa`,up:k.ordiniInAttesa>0},
          {icon:'👥',bg:'var(--info-bg)',label:'Clienti Registrati',value:k.utentiClienti,delta:'totale utenti attivi'},
          {icon:'💰',bg:'var(--success-bg)',label:'Valore Ordini',value:fmt.price(k.valoreOrdini),delta:'ordini validati + consegnati'},
        ].map(c=>`
          <div class="kpi-card">
            <div class="kpi-card__icon" style="background:${c.bg}">${c.icon}</div>
            <div>
              <div class="kpi-card__label">${c.label}</div>
              <div class="kpi-card__value">${c.value}</div>
              <div class="kpi-card__delta ${c.up?'up':''}">${c.delta}</div>
            </div>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="page-section">
          <div class="page-section__header">
            <span class="page-section__title">📊 Trend Ordini — 7 giorni</span>
          </div>
          <div style="padding:16px 20px">
            <div class="trend-chart">${trendBars}</div>
          </div>
        </div>
        <div class="page-section">
          <div class="page-section__header">
            <span class="page-section__title">🏆 Top Marche</span>
          </div>
          <div style="padding:16px 20px">
            <div class="mini-bar-chart">${barChart}</div>
          </div>
        </div>
      </div>

      <div class="page-section">
        <div class="page-section__header">
          <span class="page-section__title">📋 Ultimi Ordini</span>
          <button class="admin-btn admin-btn--secondary admin-btn--sm" onclick="AdminApp.navigate('orders')">Vedi tutti →</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>ID Ordine</th><th>Cliente</th><th>Veicolo</th>
              <th>Importo</th><th>Modalità</th><th>Stato</th><th>Data</th>
            </tr></thead>
            <tbody>
              ${ordiniRecenti.map(o=>`
                <tr>
                  <td><span style="font-family:monospace;font-weight:600;color:var(--primary-light)">${o.orderId}</span></td>
                  <td>${o.customer?.nome||''} ${o.customer?.cognome||''}</td>
                  <td>${fmt.trunc((o.vehicleSnapshot?.marca||'')+' '+(o.vehicleSnapshot?.modello||''))}</td>
                  <td style="font-weight:600">${fmt.price(o.importoTotale)}</td>
                  <td>${o.paymentMode==='credit'?'💳 Credito':'💵 Contanti'}</td>
                  <td><span class="status-badge status-badge--${o.stato}">${o.stato.replace('_',' ')}</span></td>
                  <td>${fmt.date(o.createdAt)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        ${[
          {label:'Nuovi',value:k.veicoliNuovi,color:'var(--success)',icon:'✨'},
          {label:'Usati',value:k.veicoliUsati,color:'var(--warning)',icon:'🔍'},
          {label:'Validati',value:k.ordiniValidati,color:'var(--info)',icon:'✅'},
          {label:'Consegnati',value:k.ordiniConsegnati,color:'var(--success)',icon:'🚚'},
        ].map(s=>`
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">${s.icon}</div>
            <div style="font-size:22px;font-weight:800;color:${s.color}">${s.value}</div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-top:4px">${s.label}</div>
          </div>`).join('')}
      </div>
    `;
  }

  // ============================================================
  // VEICOLI
  // ============================================================
  async function renderVehicles(page=1, search='', filters={}) {
    const raw   = DEMO_MODE ? DEMO.vehicles : (await apiCall('GET',`/vehicles?page=${page}&q=${search}`) || DEMO.vehicles);
    const items = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : DEMO.vehicles);
    const total = raw?.pagination?.total || items.length;

    // Filtrare lato client in demo
    let filtered = items;
    if (search) filtered = filtered.filter(v =>
      `${v.marca} ${v.modello} ${v.carburante}`.toLowerCase().includes(search.toLowerCase()));
    if (filters.tipo) filtered = filtered.filter(v => v.tipo === filters.tipo);

    el('cms-content').innerHTML = `
      <div class="page-section">
        <div class="page-section__header">
          <span class="page-section__title">🚗 Gestione Veicoli <span style="font-weight:400;color:var(--text-muted)">(${filtered.length})</span></span>
          <div class="page-section__actions">
            <button class="admin-btn admin-btn--primary" onclick="AdminApp.openVehicleForm()">
              + Aggiungi Veicolo
            </button>
          </div>
        </div>
        <div class="table-toolbar">
          <div class="admin-search-wrap">
            <svg class="admin-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input class="admin-search" id="v-search" placeholder="Cerca marca, modello..."
              value="${search}" oninput="AdminApp.renderVehicles(1,this.value)"/>
          </div>
          <select class="admin-select" style="width:150px" id="v-tipo-filter"
            onchange="AdminApp.renderVehicles(1,el('v-search')?.value||'',{tipo:this.value})">
            <option value="">Tutti i tipi</option>
            <option value="nuovo" ${filters.tipo==='nuovo'?'selected':''}>✨ Nuovi</option>
            <option value="usato" ${filters.tipo==='usato'?'selected':''}>🔍 Usati</option>
          </select>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>Veicolo</th><th>Tipo</th><th>Anno</th><th>KM</th>
              <th>Prezzo</th><th>Carburante</th><th>Stato</th><th>Evidenza</th>
              <th class="col-actions">Azioni</th>
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">Nessun veicolo trovato</td></tr>` :
              filtered.map(v=>`
                <tr>
                  <td>
                    <div style="font-weight:600">${v.marca} ${v.modello}</div>
                    <div style="font-size:11px;color:var(--text-muted)">#${v._id.slice(-6)}</div>
                  </td>
                  <td><span class="status-badge status-badge--${v.tipo}">${v.tipo}</span></td>
                  <td>${v.anno}</td>
                  <td>${v.tipo==='usato'?fmt.km(v.chilometri):'—'}</td>
                  <td style="font-weight:600">${fmt.price(v.prezzo)}</td>
                  <td>${v.carburante}</td>
                  <td>
                    <span class="status-badge ${v.disponibile?'status-badge--validata':'status-badge--rifiutata'}">
                      ${v.disponibile?'Disponibile':'Non disp.'}
                    </span>
                  </td>
                  <td style="text-align:center">
                    <span style="font-size:16px">${v.inEvidenza?'⭐':'—'}</span>
                  </td>
                  <td class="col-actions">
                    <button class="admin-btn admin-btn--secondary admin-btn--sm" onclick="AdminApp.openVehicleForm('${v._id}')" title="Modifica">✏️</button>
                    <button class="admin-btn admin-btn--primary admin-btn--sm" onclick="AdminApp.openImageManager('${v._id}','${v.marca} ${v.modello}')" title="Gestisci immagini">🖼️</button>
                    <button class="admin-btn admin-btn--danger admin-btn--sm" onclick="AdminApp.deleteVehicle('${v._id}','${v.marca} ${v.modello}')" title="Elimina">🗑</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="admin-pagination">
          <span>Totale: <strong>${filtered.length}</strong> veicoli</span>
          <div class="admin-pagination-btns">
            <button class="admin-pagination-btn" ${page<=1?'disabled':''} onclick="AdminApp.renderVehicles(${page-1})">←</button>
            <button class="admin-pagination-btn active">${page}</button>
            <button class="admin-pagination-btn" onclick="AdminApp.renderVehicles(${page+1})">→</button>
          </div>
        </div>
      </div>
    `;
  }

  function openVehicleForm(id = null) {
    const v = id ? (DEMO_MODE ? DEMO.vehicles.find(x=>x._id===id) : null) : null;
    const title = v ? `✏️ Modifica: ${v.marca} ${v.modello}` : '+ Nuovo Veicolo';

    openModal(title, `
      <div class="form-grid">
        <div class="form-group">
          <label class="admin-label">Marca *</label>
          <input class="admin-input" id="vm-marca" value="${v?.marca||''}" placeholder="es. BMW"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Modello *</label>
          <input class="admin-input" id="vm-modello" value="${v?.modello||''}" placeholder="es. Serie 5"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Tipo *</label>
          <select class="admin-select" id="vm-tipo">
            <option value="nuovo" ${v?.tipo==='nuovo'||!v?'selected':''}>✨ Nuovo</option>
            <option value="usato" ${v?.tipo==='usato'?'selected':''}>🔍 Usato</option>
          </select>
        </div>
        <div class="form-group">
          <label class="admin-label">Anno *</label>
          <input class="admin-input" id="vm-anno" type="number" value="${v?.anno||new Date().getFullYear()}" min="1990" max="2026"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Prezzo (€) *</label>
          <input class="admin-input" id="vm-prezzo" type="number" value="${v?.prezzo||''}" placeholder="es. 35000"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Prezzo Originale (€)</label>
          <input class="admin-input" id="vm-prezzo-old" type="number" value="${v?.prezzoOld||''}" placeholder="Lascia vuoto se nessuno sconto"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Carburante *</label>
          <select class="admin-select" id="vm-carburante">
            ${['Benzina','Diesel','Ibrido','Elettrico','GPL','Metano'].map(c=>`<option ${v?.carburante===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="admin-label">Cambio *</label>
          <input class="admin-input" id="vm-cambio" value="${v?.cambio||'Automatico'}" placeholder="es. Automatico"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Potenza</label>
          <input class="admin-input" id="vm-potenza" value="${v?.potenza||''}" placeholder="es. 190 CV"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Chilometri</label>
          <input class="admin-input" id="vm-km" type="number" value="${v?.chilometri||0}" min="0"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Colore</label>
          <input class="admin-input" id="vm-colore" value="${v?.colore||''}" placeholder="es. Nero Mythos"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Categoria</label>
          <select class="admin-select" id="vm-categoria">
            ${['berlina','suv','citycar','familiare','cabrio','sportiva','monovolume','altro'].map(c=>`<option value="${c}" ${v?.categoria===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group form-group--full">
          <label class="admin-label">Descrizione</label>
          <textarea class="admin-input" id="vm-desc" rows="3" placeholder="Descrizione veicolo...">${v?.descrizione||''}</textarea>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px">
          <input type="checkbox" id="vm-disponibile" ${v?.disponibile!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)"/>
          <label for="vm-disponibile" class="admin-label" style="margin:0;cursor:pointer">Disponibile per la vendita</label>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:12px">
          <input type="checkbox" id="vm-evidenza" ${v?.inEvidenza?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)"/>
          <label for="vm-evidenza" class="admin-label" style="margin:0;cursor:pointer">⭐ In evidenza (homepage)</label>
        </div>
      </div>
    `, `
      <button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
      <button class="admin-btn admin-btn--primary" onclick="AdminApp.saveVehicle('${id||''}')">
        ${v ? '💾 Salva Modifiche' : '➕ Crea Veicolo'}
      </button>
    `);
  }

  function saveVehicle(id) {
    const marca    = el('vm-marca')?.value.trim();
    const modello  = el('vm-modello')?.value.trim();
    const prezzo   = parseFloat(el('vm-prezzo')?.value);

    if (!marca || !modello || !prezzo) {
      toast('Compila i campi obbligatori (marca, modello, prezzo)', 'warning');
      return;
    }

    const data = {
      marca, modello,
      tipo:        el('vm-tipo')?.value,
      anno:        parseInt(el('vm-anno')?.value, 10),
      prezzo,
      prezzoOld:   parseFloat(el('vm-prezzo-old')?.value) || null,
      carburante:  el('vm-carburante')?.value,
      cambio:      el('vm-cambio')?.value,
      potenza:     el('vm-potenza')?.value,
      chilometri:  parseInt(el('vm-km')?.value, 10) || 0,
      colore:      el('vm-colore')?.value,
      categoria:   el('vm-categoria')?.value,
      descrizione: el('vm-desc')?.value,
      disponibile: el('vm-disponibile')?.checked,
      inEvidenza:  el('vm-evidenza')?.checked,
    };

    if (DEMO_MODE) {
      if (id) {
        const idx = DEMO.vehicles.findIndex(v => v._id === id);
        if (idx !== -1) DEMO.vehicles[idx] = { ...DEMO.vehicles[idx], ...data };
        toast('Veicolo aggiornato (demo)', 'success');
      } else {
        DEMO.vehicles.unshift({ ...data, _id: 'v'+Date.now(), createdAt: new Date().toISOString() });
        toast('Veicolo creato (demo)', 'success');
      }
    } else {
      const method = id ? 'PUT' : 'POST';
      const url    = id ? `/vehicles/${id}` : '/vehicles';
      apiCall(method, url, data).then(res => {
        if (res) toast(id?'Veicolo aggiornato':'Veicolo creato', 'success');
        else     toast('Errore dal server', 'error');
      });
    }

    closeModal();
    renderVehicles();
  }

  function deleteVehicle(id, name) {
    openModal('🗑 Elimina Veicolo',
      `<p style="color:var(--text-secondary)">Sei sicuro di voler eliminare <strong style="color:var(--text-primary)">${name}</strong>?<br>Questa azione non può essere annullata.</p>`,
      `<button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
       <button class="admin-btn admin-btn--danger" onclick="AdminApp.confirmDeleteVehicle('${id}')">🗑 Elimina</button>`
    );
  }

  function confirmDeleteVehicle(id) {
    if (DEMO_MODE) {
      DEMO.vehicles = DEMO.vehicles.filter(v => v._id !== id);
      toast('Veicolo eliminato (demo)', 'success');
    } else {
      apiCall('DELETE', `/vehicles/${id}`).then(r => r ? toast('Eliminato','success') : toast('Errore','error'));
    }
    closeModal();
    renderVehicles();
  }


  // ============================================================
  // GESTIONE IMMAGINI VEICOLO (Cloudinary)
  // ============================================================

  function openImageManager(vehicleId, vehicleName) {
    const API = `http://localhost:3000/api`;

    openModal(`🖼️ Immagini — ${vehicleName}`, `
      <div id="img-manager" style="min-height:200px">
        <div id="img-list" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px"></div>
        <div style="border:2px dashed var(--border-light);border-radius:var(--radius-lg);padding:20px;text-align:center;transition:border-color var(--transition)"
             id="drop-zone"
             ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
             ondragleave="this.style.borderColor='var(--border-light)'"
             ondrop="AdminApp.handleImageDrop(event,'${vehicleId}')">
          <div style="font-size:2.5rem;margin-bottom:8px">📸</div>
          <p style="color:var(--text-secondary);font-size:13px;margin-bottom:10px">
            Trascina le immagini qui oppure
          </p>
          <label style="cursor:pointer">
            <input type="file" id="img-file-input" multiple accept="image/jpeg,image/png,image/webp"
              style="display:none" onchange="AdminApp.handleImageSelect(event,'${vehicleId}')"/>
            <span class="admin-btn admin-btn--primary" style="display:inline-flex">
              📁 Scegli File
            </span>
          </label>
          <p style="color:var(--text-muted);font-size:11px;margin-top:8px">
            JPG, PNG, WebP — Max 10MB per immagine
          </p>
        </div>
        <div id="img-upload-progress" style="margin-top:12px;display:none">
          <div style="background:var(--bg-dark);border-radius:4px;height:6px;overflow:hidden">
            <div id="img-progress-bar" style="height:100%;background:var(--primary);width:0%;transition:width .3s"></div>
          </div>
          <p id="img-progress-text" style="font-size:12px;color:var(--text-muted);margin-top:6px;text-align:center">Caricamento...</p>
        </div>
      </div>
    `, `
      <button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Chiudi</button>
    `);

    // Caricare le immagini esistenti
    loadVehicleImages(vehicleId);
  }

  async function loadVehicleImages(vehicleId) {
    const listEl = el('img-list');
    if (!listEl) return;
    listEl.innerHTML = '<p style="color:var(--text-muted);font-size:13px">Caricamento...</p>';

    try {
      const res  = await fetch(`http://localhost:3000/api/upload/vehicles/${vehicleId}/images`);
      const data = await res.json();
      const imgs = data.data?.images || [];

      if (!imgs.length) {
        listEl.innerHTML = '<p style="color:var(--text-muted);font-size:12px">Nessuna immagine caricata</p>';
        return;
      }

      listEl.innerHTML = imgs.map((url, i) => `
        <div style="position:relative;width:120px" data-url="${url}">
          <img src="${url}" alt="Foto ${i+1}"
            style="width:120px;height:80px;object-fit:cover;border-radius:var(--radius);border:1px solid var(--border)"/>
          ${i===0?'<span style="position:absolute;top:4px;left:4px;background:var(--primary);color:white;font-size:10px;padding:2px 6px;border-radius:3px;font-weight:700">COPERTINA</span>':''}
          <div style="display:flex;gap:4px;margin-top:4px">
            ${i>0?`<button class="admin-btn admin-btn--secondary admin-btn--sm" style="flex:1;font-size:10px"
              onclick="AdminApp.setAsCopertina('${vehicleId}','${url}')">⭐</button>`:''}
            <button class="admin-btn admin-btn--danger admin-btn--sm" style="flex:1;font-size:10px"
              onclick="AdminApp.deleteVehicleImage('${vehicleId}','${url}')">🗑</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      listEl.innerHTML = '<p style="color:var(--danger);font-size:12px">Errore caricamento immagini</p>';
    }
  }

  async function handleImageDrop(event, vehicleId) {
    event.preventDefault();
    el('drop-zone').style.borderColor = 'var(--border-light)';
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) await uploadImages(files, vehicleId);
  }

  async function handleImageSelect(event, vehicleId) {
    const files = Array.from(event.target.files);
    if (files.length) await uploadImages(files, vehicleId);
  }

  async function uploadImages(files, vehicleId) {
    const progressWrap = el('img-upload-progress');
    const progressBar  = el('img-progress-bar');
    const progressText = el('img-progress-text');
    if (progressWrap) progressWrap.style.display = 'block';

    const token = localStorage.getItem('haxisa_admin_token');
    let uploaded = 0;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast(`File troppo grande: ${file.name}`, 'warning');
        continue;
      }

      if (progressText) progressText.textContent = `Caricamento ${file.name}...`;

      try {
        const formData = new FormData();
        formData.append('image', file);

        // Usare fetch con FormData per multipart
        const res = await fetch(`http://localhost:3000/api/upload/vehicles/${vehicleId}/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json();

        if (data.success) {
          uploaded++;
          const pct = Math.round((uploaded / files.length) * 100);
          if (progressBar) progressBar.style.width = pct + '%';
        } else {
          toast(`Errore: ${data.message}`, 'error');
        }
      } catch (e) {
        toast(`Errore upload: ${file.name}`, 'error');
      }
    }

    if (progressWrap) progressWrap.style.display = 'none';
    if (uploaded > 0) {
      toast(`${uploaded} immagini caricate su Cloudinary ✓`, 'success');
      loadVehicleImages(vehicleId);
    }
  }

  async function deleteVehicleImage(vehicleId, imageUrl) {
    if (!confirm('Eliminare questa immagine?')) return;
    const token = localStorage.getItem('haxisa_admin_token');
    try {
      const res  = await fetch(`http://localhost:3000/api/upload/vehicles/${vehicleId}/image`, {
        method: 'DELETE',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.success) {
        toast('Immagine eliminata', 'success');
        loadVehicleImages(vehicleId);
      } else {
        toast('Errore eliminazione', 'error');
      }
    } catch (e) {
      toast('Errore di connessione', 'error');
    }
  }

  async function setAsCopertina(vehicleId, imageUrl) {
    const token = localStorage.getItem('haxisa_admin_token');
    try {
      // Prima ottieni tutte le immagini, poi metti quella selezionata in prima posizione
      const res  = await fetch(`http://localhost:3000/api/upload/vehicles/${vehicleId}/images`);
      const data = await res.json();
      const imgs = data.data?.images || [];
      const reordered = [imageUrl, ...imgs.filter(u => u !== imageUrl)];

      const res2 = await fetch(`http://localhost:3000/api/upload/vehicles/${vehicleId}/images/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ images: reordered }),
      });
      const data2 = await res2.json();
      if (data2.success) {
        toast('Immagine di copertina aggiornata ✓', 'success');
        loadVehicleImages(vehicleId);
      }
    } catch (e) {
      toast('Errore aggiornamento copertina', 'error');
    }
  }


  // ============================================================
  // ORDINI
  // ============================================================
  async function renderOrders(page=1, search='', statoFilter='') {
    const items = DEMO_MODE ? DEMO.orders : (await apiCall('GET','/orders')||DEMO.orders);
    let filtered = Array.isArray(items) ? items : (items?.data || DEMO.orders);
    if (search) filtered = filtered.filter(o =>
      `${o.orderId} ${o.customer?.nome} ${o.customer?.cognome} ${o.customer?.email}`.toLowerCase().includes(search.toLowerCase()));
    if (statoFilter) filtered = filtered.filter(o => o.stato === statoFilter);

    const stati = ['in_attesa','validata','in_lavorazione','consegnata','rifiutata','annullata'];

    el('cms-content').innerHTML = `
      <div class="page-section">
        <div class="page-section__header">
          <span class="page-section__title">📋 Gestione Ordini <span style="font-weight:400;color:var(--text-muted)">(${filtered.length})</span></span>
        </div>
        <div class="table-toolbar">
          <div class="admin-search-wrap">
            <svg class="admin-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="admin-search" id="o-search" placeholder="Cerca ID, cliente..." value="${search}"
              oninput="AdminApp.renderOrders(1,this.value,document.getElementById('o-stato')?.value||'')"/>
          </div>
          <select class="admin-select" style="width:160px" id="o-stato"
            onchange="AdminApp.renderOrders(1,document.getElementById('o-search')?.value||'',this.value)">
            <option value="">Tutti gli stati</option>
            ${stati.map(s=>`<option value="${s}" ${statoFilter===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
          </select>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>ID Ordine</th><th>Cliente</th><th>Veicolo</th><th>Modalità</th>
              <th>Importo</th><th>Stato</th><th>Data</th><th class="col-actions">Azioni</th>
            </tr></thead>
            <tbody>
              ${filtered.length===0?`<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">Nessun ordine trovato</td></tr>`:
              filtered.map(o=>`
                <tr>
                  <td><span style="font-family:monospace;font-weight:600;font-size:12px;color:var(--primary-light)">${o.orderId}</span></td>
                  <td>
                    <div style="font-weight:500">${o.customer?.nome||''} ${o.customer?.cognome||''}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${o.customer?.email||''}</div>
                  </td>
                  <td>${fmt.trunc((o.vehicleSnapshot?.marca||'')+' '+(o.vehicleSnapshot?.modello||''),25)}</td>
                  <td>${o.paymentMode==='credit'?'💳 Credito':'💵 Contanti'}</td>
                  <td style="font-weight:600">${fmt.price(o.importoTotale)}</td>
                  <td><span class="status-badge status-badge--${o.stato}">${o.stato.replace(/_/g,' ')}</span></td>
                  <td>${fmt.date(o.createdAt)}</td>
                  <td class="col-actions">
                    <button class="admin-btn admin-btn--secondary admin-btn--sm" onclick="AdminApp.viewOrder('${o._id}')">👁</button>
                    <button class="admin-btn admin-btn--primary admin-btn--sm" onclick="AdminApp.changeOrderStatus('${o._id}','${o.stato}')">📝</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="admin-pagination">
          <span>Totale: <strong>${filtered.length}</strong> ordini</span>
          <div class="admin-pagination-btns">
            <button class="admin-pagination-btn" ${page<=1?'disabled':''} onclick="AdminApp.renderOrders(${page-1})">←</button>
            <button class="admin-pagination-btn active">${page}</button>
            <button class="admin-pagination-btn" onclick="AdminApp.renderOrders(${page+1})">→</button>
          </div>
        </div>
      </div>
    `;
  }

  function viewOrder(id) {
    const o = DEMO.orders.find(x => x._id === id) || {};
    openModal(`📋 Ordine ${o.orderId}`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${[
          ['ID Ordine', o.orderId],
          ['Stato', `<span class="status-badge status-badge--${o.stato}">${(o.stato||'').replace(/_/g,' ')}</span>`],
          ['Cliente', `${o.customer?.nome||''} ${o.customer?.cognome||''}`],
          ['Email', o.customer?.email||'—'],
          ['Veicolo', `${o.vehicleSnapshot?.marca||''} ${o.vehicleSnapshot?.modello||''}`],
          ['Modalità', o.paymentMode==='credit'?'💳 Credito':'💵 Contanti'],
          ['Importo', fmt.price(o.importoTotale)],
          ['Data', fmt.date(o.createdAt)],
        ].map(([k,v])=>`
          <div style="background:var(--bg-dark);border-radius:var(--radius);padding:10px 12px">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px">${k}</div>
            <div style="font-size:13px;font-weight:600">${v}</div>
          </div>`).join('')}
      </div>
    `, `<button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Chiudi</button>
        <button class="admin-btn admin-btn--primary" onclick="AdminApp.changeOrderStatus('${id}','${o.stato}')">📝 Cambia Stato</button>`);
  }

  function changeOrderStatus(id, currentStato) {
    const stati = ['in_attesa','validata','in_lavorazione','consegnata','rifiutata','annullata'];
    openModal('📝 Aggiorna Stato Ordine', `
      <div class="form-group">
        <label class="admin-label">Nuovo Stato</label>
        <select class="admin-select" id="new-stato">
          ${stati.map(s=>`<option value="${s}" ${s===currentStato?'selected':''}>${s.replace(/_/g,' ')}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="admin-label">Nota interna (opzionale)</label>
        <textarea class="admin-input" id="status-nota" rows="2" placeholder="es. Pratica finanziamento approvata..."></textarea>
      </div>
    `, `
      <button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
      <button class="admin-btn admin-btn--primary" onclick="AdminApp.saveOrderStatus('${id}')">💾 Aggiorna</button>
    `);
  }

  function saveOrderStatus(id) {
    const nuovoStato = el('new-stato')?.value;
    if (!nuovoStato) return;
    if (DEMO_MODE) {
      const o = DEMO.orders.find(x => x._id === id);
      if (o) o.stato = nuovoStato;
      toast(`Stato aggiornato: ${nuovoStato.replace('_',' ')}`, 'success');
    } else {
      apiCall('PATCH', `/orders/${id}/status`, { status: nuovoStato, nota: el('status-nota')?.value })
        .then(r => r ? toast('Stato aggiornato','success') : toast('Errore','error'));
    }
    closeModal();
    renderOrders();
  }

  // ============================================================
  // UTENTI
  // ============================================================
  async function renderUsers(page=1, search='') {
    const items    = DEMO_MODE ? DEMO.users : (await apiCall('GET','/users')||DEMO.users);
    let filtered   = Array.isArray(items) ? items : (items?.data || DEMO.users);
    if (search) filtered = filtered.filter(u =>
      `${u.nome} ${u.cognome} ${u.email}`.toLowerCase().includes(search.toLowerCase()));

    el('cms-content').innerHTML = `
      <div class="page-section">
        <div class="page-section__header">
          <span class="page-section__title">👥 Gestione Utenti <span style="font-weight:400;color:var(--text-muted)">(${filtered.length})</span></span>
          <div class="page-section__actions">
            <button class="admin-btn admin-btn--primary" onclick="AdminApp.openUserForm()">+ Nuovo Utente</button>
          </div>
        </div>
        <div class="table-toolbar">
          <div class="admin-search-wrap">
            <svg class="admin-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input class="admin-search" placeholder="Cerca nome, email..." value="${search}"
              oninput="AdminApp.renderUsers(1,this.value)"/>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Utente</th><th>Email</th><th>Ruolo</th><th>Stato</th><th>Registrato</th><th class="col-actions">Azioni</th></tr></thead>
            <tbody>
              ${filtered.map(u=>`
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#c0392b,#2c3e50);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">
                        ${((u.nome||'?')[0]+(u.cognome||'')[0]).toUpperCase()}
                      </div>
                      <div>
                        <div style="font-weight:500">${u.nome} ${u.cognome}</div>
                        <div style="font-size:11px;color:var(--text-muted)">#${(u._id||'').slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td>${u.email}</td>
                  <td><span class="status-badge status-badge--${u.ruolo}">${u.ruolo}</span></td>
                  <td><span class="status-badge ${u.attivo?'status-badge--validata':'status-badge--rifiutata'}">${u.attivo?'Attivo':'Disattivo'}</span></td>
                  <td>${fmt.date(u.createdAt)}</td>
                  <td class="col-actions">
                    <button class="admin-btn admin-btn--secondary admin-btn--sm" onclick="AdminApp.openUserForm('${u._id}')">✏️</button>
                    <button class="admin-btn admin-btn--danger admin-btn--sm" onclick="AdminApp.deleteUser('${u._id}','${u.nome} ${u.cognome}')">🗑</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function openUserForm(id=null) {
    const u = id ? DEMO.users.find(x=>x._id===id) : null;
    openModal(u?`✏️ Modifica Utente`:'+ Nuovo Utente', `
      <div class="form-grid">
        <div class="form-group">
          <label class="admin-label">Nome *</label>
          <input class="admin-input" id="um-nome" value="${u?.nome||''}"/>
        </div>
        <div class="form-group">
          <label class="admin-label">Cognome *</label>
          <input class="admin-input" id="um-cognome" value="${u?.cognome||''}"/>
        </div>
        <div class="form-group form-group--full">
          <label class="admin-label">Email *</label>
          <input class="admin-input" id="um-email" type="email" value="${u?.email||''}"/>
        </div>
        ${!u?`<div class="form-group form-group--full">
          <label class="admin-label">Password *</label>
          <input class="admin-input" id="um-password" type="password" placeholder="Min. 8 caratteri"/>
        </div>`:''}
        <div class="form-group">
          <label class="admin-label">Ruolo</label>
          <select class="admin-select" id="um-ruolo">
            <option value="cliente" ${u?.ruolo==='cliente'||!u?'selected':''}>Cliente</option>
            <option value="admin"   ${u?.ruolo==='admin'?'selected':''}>Admin</option>
          </select>
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px;align-self:end;padding-bottom:4px">
          <input type="checkbox" id="um-attivo" ${u?.attivo!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--primary)"/>
          <label for="um-attivo" class="admin-label" style="margin:0;cursor:pointer">Account Attivo</label>
        </div>
      </div>
    `, `
      <button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
      <button class="admin-btn admin-btn--primary" onclick="AdminApp.saveUser('${id||''}')">
        ${u?'💾 Salva':'➕ Crea'}
      </button>
    `);
  }

  function saveUser(id) {
    const nome = el('um-nome')?.value.trim();
    const email = el('um-email')?.value.trim();
    if (!nome || !email) { toast('Nome ed email obbligatori','warning'); return; }
    if (DEMO_MODE) {
      if (id) {
        const u = DEMO.users.find(x=>x._id===id);
        if (u) { u.nome=nome; u.email=email; u.ruolo=el('um-ruolo')?.value; u.attivo=el('um-attivo')?.checked; }
        toast('Utente aggiornato (demo)','success');
      } else {
        DEMO.users.push({_id:'u'+Date.now(),nome,cognome:el('um-cognome')?.value||'',email,ruolo:el('um-ruolo')?.value||'cliente',attivo:true,createdAt:new Date().toISOString()});
        toast('Utente creato (demo)','success');
      }
    }
    closeModal(); renderUsers();
  }

  function deleteUser(id, name) {
    openModal('🗑 Elimina Utente',
      `<p style="color:var(--text-secondary)">Eliminare <strong style="color:var(--text-primary)">${name}</strong>?</p>`,
      `<button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
       <button class="admin-btn admin-btn--danger" onclick="DEMO.users=DEMO.users.filter(u=>u._id!=='${id}');AdminApp.closeModal();AdminApp.renderUsers();AdminApp.toast('Utente eliminato','success')">Elimina</button>`
    );
  }

  // ============================================================
  // CONTENUTI CMS
  // ============================================================
  async function renderContent() {
    const items = DEMO_MODE ? DEMO.content : (await apiCall('GET','/content')?.list || DEMO.content);

    el('cms-content').innerHTML = `
      <div class="page-section">
        <div class="page-section__header">
          <span class="page-section__title">📝 Contenuti CMS <span style="font-weight:400;color:var(--text-muted)">(${items.length} chiavi)</span></span>
          <div class="page-section__actions">
            <span style="font-size:12px;color:var(--text-muted)">Modifica i testi del sito pubblico</span>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Chiave</th><th>Titolo</th><th>Contenuto</th><th>Tipo</th><th class="col-actions">Azioni</th></tr></thead>
            <tbody>
              ${items.map(c=>`
                <tr>
                  <td><code style="font-size:11px;background:var(--bg-dark);padding:2px 6px;border-radius:4px;color:var(--primary-light)">${c.chiave}</code></td>
                  <td style="font-weight:500">${c.titolo}</td>
                  <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary)">
                    ${fmt.trunc(c.corpo, 60)}
                  </td>
                  <td><span class="status-badge status-badge--in_lavorazione">${c.tipo}</span></td>
                  <td class="col-actions">
                    <button class="admin-btn admin-btn--primary admin-btn--sm" onclick="AdminApp.editContent('${c.chiave}')">✏️ Modifica</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function editContent(chiave) {
    const c = DEMO.content.find(x=>x.chiave===chiave) || {};
    openModal(`✏️ Modifica: ${c.titolo||chiave}`, `
      <div class="form-group">
        <label class="admin-label">Chiave (sola lettura)</label>
        <input class="admin-input" value="${chiave}" readonly style="opacity:.5;cursor:not-allowed"/>
      </div>
      <div class="form-group">
        <label class="admin-label">Titolo</label>
        <input class="admin-input" id="ct-titolo" value="${c.titolo||''}"/>
      </div>
      <div class="form-group">
        <label class="admin-label">Contenuto *</label>
        <textarea class="admin-input" id="ct-corpo" rows="${c.tipo==='testo_lungo'||c.tipo==='html'?6:3}">${c.corpo||''}</textarea>
      </div>
    `, `
      <button class="admin-btn admin-btn--secondary" onclick="AdminApp.closeModal()">Annulla</button>
      <button class="admin-btn admin-btn--primary" onclick="AdminApp.saveContent('${chiave}')">💾 Salva</button>
    `);
  }

  function saveContent(chiave) {
    const corpo = el('ct-corpo')?.value;
    if (!corpo && corpo !== '') { toast('Contenuto obbligatorio','warning'); return; }
    if (DEMO_MODE) {
      const c = DEMO.content.find(x=>x.chiave===chiave);
      if (c) { c.corpo=corpo; c.titolo=el('ct-titolo')?.value||c.titolo; }
      toast('Contenuto aggiornato (demo)','success');
    } else {
      apiCall('PUT', `/content/${chiave}`, { corpo, titolo: el('ct-titolo')?.value })
        .then(r => r ? toast('Salvato','success') : toast('Errore','error'));
    }
    closeModal(); renderContent();
  }

  // ============================================================
  // INIZIALIZZAZIONE
  // ============================================================
  function init() {
    // Se già loggato, mostrare il CMS
    if (state.token && state.user) {
      el('login-overlay').style.display = 'none';
      el('cms-layout').style.display    = 'flex';
      el('user-name').textContent   = `${state.user.nome||''} ${state.user.cognome||''}`.trim();
      el('user-avatar').textContent = ((state.user.nome||'A')[0]+(state.user.cognome||'')[0]).toUpperCase()||'A';
      navigate('dashboard');
      checkApiStatus();
    }

    // Chiudere modal con Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && el('cms-modal')?.style.display !== 'none') closeModal();
    });

    // Chiudere sidebar cliccando fuori (mobile)
    document.addEventListener('click', e => {
      const sidebar = el('cms-sidebar');
      if (sidebar?.classList.contains('open') && !sidebar.contains(e.target) && !el('cms-topbar')?.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Avvio al caricamento DOM
  document.addEventListener('DOMContentLoaded', init);

  // ============================================================
  // EXPORT API PUBBLICA
  // ============================================================
  return {
    login, logout, togglePassword,
    navigate, toggleSidebar, refresh,
    renderVehicles, openVehicleForm, saveVehicle, deleteVehicle, confirmDeleteVehicle,
    renderOrders, viewOrder, changeOrderStatus, saveOrderStatus,
    renderUsers, openUserForm, saveUser, deleteUser,
    renderContent, editContent, saveContent,
    closeModal, toast,
    // Gestione immagini
    openImageManager, loadVehicleImages, handleImageDrop, handleImageSelect,
    uploadImages, deleteVehicleImage, setAsCopertina,
    // Per accesso inline negli HTML generati
    el,
    DEMO,
  };

})();

window.el = (id) => document.getElementById(id);
