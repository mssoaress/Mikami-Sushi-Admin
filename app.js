// ============================================================
// app.js — Lógica completa do sistema Mikami Sushi
// ============================================================
// Organização:
//   1. CARDÁPIO
//   2. UTILITÁRIOS
//   3. PÁGINA: INDEX (mesas)
//   4. PÁGINA: MESA (pedidos)
//   5. PÁGINA: COZINHA
//   6. PÁGINA: RELATÓRIO + FATURAMENTO
//   7. INIT
// ============================================================

import {
  db,
  collection, doc,
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp, increment, runTransaction
} from "./firebase.js";

// ============================================================
// 1. CARDÁPIO
// ============================================================
const CARDAPIO = [
  // COMBOS
  { nome: "Combo Temaki Salmão + 10 Hot Roll", categoria: "Combos", preco: 37.00, ativo: true },
  { nome: "Combo Mini Dog + 3 Croquetes + 3 Uramaki", categoria: "Combos", preco: 32.00, ativo: true },
  { nome: "Combo 10 Hot Skin + 10 Uramaki + 10 Hosomaki Kani", categoria: "Combos", preco: 43.00, ativo: true },
  { nome: "Combo 20 Hot Roll Sortidas", categoria: "Combos", preco: 32.00, ativo: true },
  { nome: "Combo 2 Joe + 2 Niguiri + 5 Uramaki + 5 Hosomaki + 6 Hot Roll", categoria: "Combos", preco: 46.00, ativo: true },
  // INDIVIDUAIS
  { nome: "Uramaki de Salmão", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll de Salmão", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll de Kani", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll Skin", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hosomaki de Salmão", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Rolinho Primavera (4 un.)", categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Croquete de Salmão (6 un.)", categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Kani Queijo (6 un.)", categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Hot Dog Salmão", categoria: "Individuais", preco: 30.00, ativo: true },
  { nome: "Hot Dog Salmão e Camarão", categoria: "Individuais", preco: 35.00, ativo: true },
  { nome: "Sunomono", categoria: "Individuais", preco: 10.00, ativo: true },
  // ESPECIAIS
  { nome: "Uramaki Kani com Camarão", categoria: "Especiais", preco: 27.00, ativo: true },
  { nome: "Uramaki Salmão Geleia", categoria: "Especiais", preco: 27.00, ativo: true },
  { nome: "Hot Especial", categoria: "Especiais", preco: 22.00, ativo: true },
  { nome: "Nathos de Salmão e Geleia (4 un.)", categoria: "Especiais", preco: 15.00, ativo: true },
  { nome: "Joe (3 un.)", categoria: "Especiais", preco: 18.00, ativo: true },
  { nome: "Niguiri (3 un.)", categoria: "Especiais", preco: 15.00, ativo: true },
  { nome: "Mikami Supremo 500g", categoria: "Especiais", preco: 45.00, ativo: true },
  // TEMAKIS
  { nome: "Temaki Copo Salmão", categoria: "Temakis", preco: 28.00, ativo: true },
  { nome: "Temaki de Salmão", categoria: "Temakis", preco: 25.00, ativo: true },
  { nome: "Temaki de Kani", categoria: "Temakis", preco: 22.00, ativo: true },
  { nome: "Temaki de Skin", categoria: "Temakis", preco: 21.00, ativo: true },
  { nome: "Temaki de Camarão", categoria: "Temakis", preco: 30.00, ativo: true },
  // YAKISOBA
  { nome: "Yakisoba Individual", categoria: "Yakisoba", preco: 20.00, ativo: true },
  { nome: "Yakisoba 2 Pessoas", categoria: "Yakisoba", preco: 30.00, ativo: true },
  // DOCES
  { nome: "Harumaki Banana com Nutella", categoria: "Doces", preco: 20.00, ativo: true },
  { nome: "Harumaki Nutella + Doce de Leite + Romeu e Julieta", categoria: "Doces", preco: 22.00, ativo: true },
  // BEBIDAS
  { nome: "Coca Zero Lata 220ml", categoria: "Bebidas", preco: 4.50, ativo: true },
  { nome: "Coca Lata 350ml", categoria: "Bebidas", preco: 6.00, ativo: true },
  { nome: "Fanta Lata 220ml", categoria: "Bebidas", preco: 6.00, ativo: true },
  { nome: "Kuat Lata 220ml", categoria: "Bebidas", preco: 4.50, ativo: true },
  { nome: "Coca Mini Pet 250ml", categoria: "Bebidas", preco: 5.00, ativo: true },
  { nome: "Coca Zero Mini Pet 250ml", categoria: "Bebidas", preco: 5.00, ativo: true },
  { nome: "Água", categoria: "Bebidas", preco: 3.00, ativo: true },
  { nome: "Água com Gás", categoria: "Bebidas", preco: 4.00, ativo: true },
];

const TOTAL_MESAS = 12;

// ============================================================
// 2. UTILITÁRIOS
// ============================================================

// Escape de HTML — evita XSS ao injetar dados do Firestore via innerHTML
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMoeda(v) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHora(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDataHora(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtTempo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

function toast(msg, tipo = "info") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => { el.classList.remove("visible"); setTimeout(() => el.remove(), 250); }, 3000);
}

function iniciarRelogio() {
  const el = document.getElementById("headerClock");
  if (!el) return;
  const atualizar = () => {
    el.textContent = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  };
  atualizar();
  setInterval(atualizar, 1000);
}

// Modal de confirmação genérico (substitui confirm() nativo)
function _confirmarAcao(mensagem) {
  return new Promise(resolve => {
    let overlay = document.getElementById("_modalConfirm");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "_modalConfirm";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-box" style="max-width:380px;border-radius:var(--raio-lg)">
          <p id="_modalConfirmMsg" style="font-size:0.9rem;color:var(--branco);margin-bottom:1.25rem;line-height:1.5"></p>
          <div class="modal-acoes">
            <button class="btn-secondary" id="_modalConfirmNao">Cancelar</button>
            <button class="btn-primary" id="_modalConfirmSim">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById("_modalConfirmMsg").textContent = mensagem;
    overlay.classList.add("open");
    const fechar = (res) => { overlay.classList.remove("open"); resolve(res); };
    document.getElementById("_modalConfirmSim").onclick = () => fechar(true);
    document.getElementById("_modalConfirmNao").onclick = () => fechar(false);
    overlay.onclick = (e) => { if (e.target === overlay) fechar(false); };
  });
}

// Seed
const SEED_VERSION = `mikami_seed_v${CARDAPIO.length}_m${TOTAL_MESAS}`;

async function garantirProdutos() {
  if (localStorage.getItem(SEED_VERSION + "_prod") === "ok") return;
  try {
    const snap = await getDocs(collection(db, "produtos"));
    if (snap.size >= CARDAPIO.length) {
      localStorage.setItem(SEED_VERSION + "_prod", "ok");
      return;
    }
    const existentes = new Set(snap.docs.map(d => d.id));
    await Promise.all(CARDAPIO.map((p, i) => {
      const id = `prod_${i.toString().padStart(3, "0")}`;
      return existentes.has(id) ? Promise.resolve() : setDoc(doc(db, "produtos", id), p);
    }));
    localStorage.setItem(SEED_VERSION + "_prod", "ok");
  } catch (err) { console.error("[Mikami] Seed produtos:", err); }
}

async function garantirMesas() {
  if (localStorage.getItem(SEED_VERSION + "_mesas") === "ok") return;
  try {
    const snap = await getDocs(collection(db, "mesas"));
    const existentes = new Set(snap.docs.map(d => d.id));
    const promises = [];
    for (let i = 1; i <= TOTAL_MESAS; i++) {
      const id = `mesa_${i}`;
      if (!existentes.has(id)) {
        promises.push(setDoc(doc(db, "mesas", id), {
          numero: i, status: "livre", abertaEm: null,
          total: 0, pedidosCount: 0, historicoPedidos: []
        }));
      }
    }
    if (promises.length) await Promise.all(promises);
    localStorage.setItem(SEED_VERSION + "_mesas", "ok");
  } catch (err) { console.error("[Mikami] Seed mesas:", err); }
}

async function migrarDelivery() {
  ["mikami_delivery_v5","mikami_delivery_v6","mikami_delivery_v7","mikami_delivery_v8"].forEach(k => localStorage.removeItem(k));
  if (localStorage.getItem("mikami_delivery_v9") === "ok") return;
  try {
    const snap = await getDocs(collection(db, "mesas"));
    const ups = snap.docs.filter(d => (d.data().numero || 0) >= 11)
      .map(d => updateDoc(d.ref, { tipo: "delivery", entrega: d.data().entrega || { local: "", taxa: 0 } }));
    await Promise.all(ups);
    localStorage.setItem("mikami_delivery_v9", "ok");
  } catch (e) { console.error(e); }
}

// ============================================================
// 3. PÁGINA: INDEX — MESAS
// ============================================================

function initModalAddMesa() {
  const abrirModal = () => {
    document.getElementById("modalAddMesa").classList.add("open");
    document.getElementById("addMesaStatus").textContent = "";
    document.getElementById("addMesaStatus").style.color = "var(--cinza-texto)";
  };

  // Botão desktop (dentro da stats-bar)
  document.getElementById("btnAddMesa")?.addEventListener("click", abrirModal);
  // FAB mobile (fora da stats-bar, fixo no canto)
  document.getElementById("btnAddMesaFab")?.addEventListener("click", abrirModal);

  document.getElementById("btnCancelarAddMesa")?.addEventListener("click", () =>
    document.getElementById("modalAddMesa").classList.remove("open"));
  document.getElementById("btnAddRestaurante")?.addEventListener("click", () => adicionarMesa("restaurante"));
  document.getElementById("btnAddDelivery")?.addEventListener("click", () => adicionarMesa("delivery"));

  document.getElementById("modalAddMesa")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("open");
  });
}

async function adicionarMesa(tipo) {
  const status = document.getElementById("addMesaStatus");
  if (status) { status.style.color = "var(--cinza-texto)"; status.textContent = "Criando mesa..."; }
  try {
    const snap = await getDocs(collection(db, "mesas"));
    const prox = snap.docs.reduce((max, d) => Math.max(max, d.data().numero || 0), 0) + 1;
    await setDoc(doc(db, "mesas", `mesa_${prox}`), {
      numero: prox, tipo, status: "livre", abertaEm: null,
      total: 0, pedidosCount: 0, historicoPedidos: [], entrega: { local: "", taxa: 0 }
    });
    if (status) { status.style.color = "var(--verde)"; status.textContent = `✓ Mesa ${prox} (${tipo === "delivery" ? "🛵 Delivery" : "🍽️ Restaurante"}) criada!`; }
    setTimeout(() => document.getElementById("modalAddMesa")?.classList.remove("open"), 1500);
  } catch (e) {
    if (status) { status.style.color = "var(--vermelho-soft)"; status.textContent = "Erro ao criar mesa."; }
  }
}

function initIndex() {
  iniciarRelogio();

  let _debounceTimer = null;
  const _unsubMesas = onSnapshot(collection(db, "mesas"), snap => {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
      const mesas = [];
      snap.forEach(d => mesas.push({ id: d.id, ...d.data() }));
      mesas.sort((a, b) => a.numero - b.numero);
      renderMesas(mesas);
      renderStats(mesas);
    }, 80);
  });
  window.addEventListener("pagehide", () => { _unsubMesas(); clearTimeout(_debounceTimer); }, { once: true });

  escutarFaturamentoDia();
  Promise.all([garantirProdutos(), garantirMesas(), migrarDelivery()]).catch(console.error);
  initModalAddMesa();
}

const _mesaHash = new Map();

function _hashMesa(m) {
  return `${m.status}|${m.total}|${m.pedidosCount}|${m.abertaEm?.seconds || 0}`;
}

function _htmlCard(mesa, statusLabel) {
  const totalBase = mesa.historicoPedidos?.length
    ? mesa.historicoPedidos.reduce((a, p) => a + (p.total || 0), 0)
    : (mesa.total || 0);
  const isDelivery = mesa.tipo === "delivery";
  const taxaEntrega = mesa.entrega?.taxa || 0;
  const totalExibir = totalBase + taxaEntrega;
  return `
    <div class="mesa-card ${mesa.status}${isDelivery ? " mesa-delivery" : ""}" data-mesa-id="${mesa.id}" data-mesa-num="${mesa.numero}">
      <div class="mesa-card-header">
        <div class="mesa-numero">${mesa.numero}</div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <div class="mesa-status-pill status-${mesa.status}">${statusLabel[mesa.status] || mesa.status}</div>
          ${isDelivery ? `<div class="mesa-delivery-badge">🛵 Delivery</div>` : ""}
        </div>
      </div>
      <div class="mesa-card-info">
        <div class="mesa-total">${mesa.status !== "livre" ? fmtMoeda(totalExibir) : "—"}</div>
        <div class="mesa-meta">
          ${mesa.abertaEm ? `<span>Aberta: ${fmtHora(mesa.abertaEm)}</span>` : `<span>${isDelivery ? "Delivery livre" : "Mesa livre"}</span>`}
          ${mesa.pedidosCount ? `<span>${mesa.pedidosCount} pedido(s)</span>` : ""}
          ${isDelivery && mesa.entrega?.local ? `<span>📍 ${esc(mesa.entrega.local)}</span>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderMesas(mesas) {
  const grid = document.getElementById("mesasGrid");
  if (!grid) return;
  const statusLabel = { livre: "Livre", ocupada: "Ocupada", aguardando: "Aguardando Pagto." };

  if (!grid.querySelector(".mesa-card")) {
    grid.innerHTML = mesas.map(m => _htmlCard(m, statusLabel)).join("");
    mesas.forEach(m => _mesaHash.set(m.id, _hashMesa(m)));
    grid.querySelectorAll(".mesa-card").forEach(c => {
      c.addEventListener("click", () => { window.location.href = `mesa.html?mesa=${c.dataset.mesaNum}`; });
    });
    return;
  }

  mesas.forEach(mesa => {
    const novoHash = _hashMesa(mesa);
    if (_mesaHash.get(mesa.id) === novoHash) return;
    _mesaHash.set(mesa.id, novoHash);
    const antigo = grid.querySelector(`[data-mesa-id="${mesa.id}"]`);
    const tmp = document.createElement("div");
    tmp.innerHTML = _htmlCard(mesa, statusLabel);
    const novo = tmp.firstElementChild;
    novo.addEventListener("click", () => { window.location.href = `mesa.html?mesa=${novo.dataset.mesaNum}`; });
    if (antigo) grid.replaceChild(novo, antigo);
    else grid.appendChild(novo);
  });
}

function renderStats(mesas) {
  const el = id => document.getElementById(id);
  if (el("statLivres")) el("statLivres").textContent = mesas.filter(m => m.status === "livre").length;
  if (el("statOcupadas")) el("statOcupadas").textContent = mesas.filter(m => m.status === "ocupada").length;
  if (el("statAguardando")) el("statAguardando").textContent = mesas.filter(m => m.status === "aguardando").length;
}

function escutarFaturamentoDia() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const inicioHoje = Timestamp.fromDate(hoje);
  const q = query(collection(db, "vendas"), where("fechadoEm", ">=", inicioHoje));
  onSnapshot(q, snap => {
    let total = 0;
    snap.forEach(d => { total += d.data().total || 0; });
    const el = document.getElementById("statTotalDia");
    if (el) el.textContent = fmtMoeda(total);
  });
}

// ============================================================
// 4. PÁGINA: MESA
// ============================================================
const LOCAIS_ENTREGA = [
  { nome: "Retirada", taxa: 0, icone: "🏠" },
  { nome: "Cecilia", taxa: 3, icone: "📍" },
  { nome: "Embebedado", taxa: 5, icone: "📍" },
  { nome: "Pedra Branca", taxa: 6, icone: "📍" },
  { nome: "Cumati", taxa: 5, icone: "📍" },
  { nome: "Cecília de Cima", taxa: 6, icone: "📍" },
  { nome: "Vilinha", taxa: 6, icone: "📍" },
  { nome: "Boi Seco", taxa: 15, icone: "📍" },
  { nome: "Vertente do Lério", taxa: 15, icone: "📍" },
];

const estadoMesa = {
  numero: null,
  mesaId: null,
  dadosMesa: null,
  entrega: { local: "", taxa: 0 },
  pedidoAtual: [],
  produtos: [],
  categoriaAtiva: "Todos",
  buscaTermo: ""
};

const ADICIONAIS = [
  "Camarão", "Kani", "Cream Cheese", "Joe", "Croquete", "Hot Roll", "Uramaki", "Hossomaki",
];

async function initMesa() {
  iniciarRelogio();

  const params = new URLSearchParams(window.location.search);
  estadoMesa.numero = parseInt(params.get("mesa")) || 1;
  estadoMesa.mesaId = `mesa_${estadoMesa.numero}`;

  document.getElementById("mesaNumeroBadge").textContent = `Mesa ${estadoMesa.numero}`;
  document.title = `Mesa ${estadoMesa.numero} — Mikami Sushi`;

  // Cache do sessionStorage para cardápio
  try {
    const cacheKey = `mikami_produtos_${SEED_VERSION}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      estadoMesa.produtos = JSON.parse(cached);
    } else {
      const snapProd = await getDocs(collection(db, "produtos"));
      snapProd.forEach(d => estadoMesa.produtos.push({ id: d.id, ...d.data() }));
      estadoMesa.produtos.sort((a, b) => a.nome.localeCompare(b.nome));
      sessionStorage.setItem(cacheKey, JSON.stringify(estadoMesa.produtos));
    }
  } catch (err) {
    toast("Erro ao carregar cardápio.", "erro");
    console.error(err);
  }

  renderCategorias();
  renderProdutos();
  renderAdicionais();
  _initDrawerAdicionais();

  onSnapshot(doc(db, "mesas", estadoMesa.mesaId), snap => {
    if (!snap.exists()) return;
    estadoMesa.dadosMesa = snap.data();
    atualizarHeaderMesa();
    renderConta();
    _configurarAbaEntrega(snap.data());
  });

  document.getElementById("buscaProduto").addEventListener("input", e => {
    estadoMesa.buscaTermo = e.target.value.toLowerCase();
    renderProdutos();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      document.getElementById("buscaProduto")?.focus();
    }
  });

  document.getElementById("btnConfirmarPedido").addEventListener("click", confirmarPedido);
  document.getElementById("btnImprimirCozinha").addEventListener("click", imprimirCozinha);
  document.getElementById("btnImprimirConta").addEventListener("click", imprimirConta);
  document.getElementById("btnFecharMesa").addEventListener("click", abrirModalFechar);
  document.getElementById("btnConfirmarEntrega")?.addEventListener("click", _confirmarEntrega);
  document.getElementById("btnCancelarFechar").addEventListener("click", fecharModal);
  document.getElementById("btnConfirmarFechar").addEventListener("click", fecharMesa);

  document.querySelectorAll(".pagamento-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pagamento-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("btnConfirmarFechar").disabled = false;
    });
  });

  document.getElementById("btnCancelarEdicao")?.addEventListener("click", fecharModalEditar);
  document.getElementById("btnSalvarEdicao")?.addEventListener("click", salvarEdicaoPedido);

  // Fechar modal ao clicar no overlay
  document.getElementById("modalFecharMesa")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) fecharModal();
  });
  document.getElementById("modalEditarPedido")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) fecharModalEditar();
  });

  initModalPagamento();
}

// ── Cardápio ──────────────────────────────────────────────
function renderCategorias() {
  const cats = ["Todos", ...new Set(estadoMesa.produtos.map(p => p.categoria))];
  const container = document.getElementById("categoriasTabs");
  container.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === estadoMesa.categoriaAtiva ? "active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>
  `).join("");

  container.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      estadoMesa.categoriaAtiva = btn.dataset.cat;
      container.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderProdutos();
    });
  });
}

function renderProdutos() {
  let lista = estadoMesa.produtos.filter(p => p.ativo !== false);
  if (estadoMesa.categoriaAtiva !== "Todos") lista = lista.filter(p => p.categoria === estadoMesa.categoriaAtiva);
  if (estadoMesa.buscaTermo) lista = lista.filter(p => p.nome.toLowerCase().includes(estadoMesa.buscaTermo));

  const container = document.getElementById("produtosLista");

  if (!lista.length) {
    container.innerHTML = `<div class="pedido-vazio"><p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  container.innerHTML = lista.map(p => `
    <div class="produto-card" data-id="${esc(p.id)}">
      <div class="produto-info">
        <span class="produto-nome">${esc(p.nome)}</span>
        <span class="produto-cat-tag">${esc(p.categoria)}</span>
      </div>
      <span class="produto-preco">${fmtMoeda(p.preco)}</span>
      <button class="produto-add-btn" data-id="${esc(p.id)}" title="Adicionar ao pedido">+</button>
    </div>
  `).join("");

  container.querySelectorAll(".produto-add-btn").forEach(btn => {
    btn.addEventListener("click", e => { e.stopPropagation(); adicionarAoPedido(btn.dataset.id); });
  });
  container.querySelectorAll(".produto-card").forEach(card => {
    card.addEventListener("click", () => adicionarAoPedido(card.dataset.id));
  });
}

// ── Pedido atual ──────────────────────────────────────────
function adicionarAoPedido(prodId) {
  const prod = estadoMesa.produtos.find(p => p.id === prodId);
  if (!prod) return;
  const existente = estadoMesa.pedidoAtual.find(i => i.prodId === prodId && !i.isAdicional);
  if (existente) {
    existente.qty++;
  } else {
    estadoMesa.pedidoAtual.push({ prodId, nome: prod.nome, preco: prod.preco, qty: 1, obs: "" });
  }
  renderPedidoAtual();
  toast(`${prod.nome} adicionado`, "sucesso");
}

function renderPedidoAtual() {
  const container = document.getElementById("pedidoItens");
  const itens = estadoMesa.pedidoAtual;
  const totalPedido = itens.reduce((acc, i) => acc + i.preco * i.qty, 0);

  document.getElementById("pedidoCount").textContent = `${itens.length} item(ns)`;
  document.getElementById("pedidoTotal").textContent = fmtMoeda(totalPedido);
  document.getElementById("btnConfirmarPedido").disabled = itens.length === 0;

  // Atualiza badge da aba mobile
  const badge = document.getElementById("pedidoBadge");
  if (badge) {
    badge.textContent = itens.length > 0 ? ` ${itens.length}` : "";
    badge.style.display = itens.length > 0 ? "" : "none";
  }

  if (!itens.length) {
    container.innerHTML = `
      <div class="pedido-vazio">
        <span class="pedido-vazio-icon">🍱</span>
        <p>Nenhum item adicionado</p>
      </div>`;
    return;
  }

  container.innerHTML = itens.map((item, idx) => `
    <div class="pedido-item" data-idx="${idx}">
      <div class="pedido-item-header">
        <span class="pedido-item-nome">${esc(item.nome)}</span>
        <span class="pedido-item-subtotal">${fmtMoeda(item.preco * item.qty)}</span>
        <button class="remove-item-btn" data-idx="${idx}" title="Remover item">✕</button>
      </div>
      <div class="pedido-item-controls">
        <button class="qty-btn" data-idx="${idx}" data-acao="dec">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-acao="inc">+</button>
        <span style="font-size:0.68rem;color:var(--cinza-texto);margin-left:0.3rem">${fmtMoeda(item.preco)} un.</span>
      </div>
      <textarea class="obs-input" placeholder="Observação (ex: sem cream cheese)" data-idx="${idx}">${esc(item.obs)}</textarea>
    </div>
  `).join("");

  container.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.acao === "inc") {
        estadoMesa.pedidoAtual[idx].qty++;
      } else {
        estadoMesa.pedidoAtual[idx].qty--;
        if (estadoMesa.pedidoAtual[idx].qty <= 0) estadoMesa.pedidoAtual.splice(idx, 1);
      }
      renderPedidoAtual();
    });
  });

  container.querySelectorAll(".remove-item-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      estadoMesa.pedidoAtual.splice(parseInt(btn.dataset.idx), 1);
      renderPedidoAtual();
    });
  });

  container.querySelectorAll(".obs-input").forEach(input => {
    input.addEventListener("input", () => {
      const idx = parseInt(input.dataset.idx);
      if (estadoMesa.pedidoAtual[idx]) estadoMesa.pedidoAtual[idx].obs = input.value;
    });
  });
}

// ── Adicionais drawer ─────────────────────────────────────
function renderAdicionais() {
  const container = document.getElementById("adicionaisLista");
  if (!container) return;

  container.innerHTML = ADICIONAIS.map((nome, idx) => `
    <div class="adicional-card" id="adCard_${idx}">
      <span class="adicional-nome">${nome}</span>
      <div class="adicional-valor-row" id="adValorRow_${idx}" style="display:none">
        <span class="adicional-cifrao">R$</span>
        <input class="adicional-valor-input" id="adValor_${idx}" type="number" min="0" step="0.5" placeholder="0,00" inputmode="decimal" autocomplete="off" />
        <button class="adicional-ok-btn" data-idx="${idx}" title="Confirmar">✓</button>
        <button class="adicional-cancel-btn" data-idx="${idx}" title="Cancelar">✕</button>
      </div>
      <button class="adicional-add-btn" id="adBtn_${idx}" data-idx="${idx}" title="Adicionar">+</button>
    </div>
  `).join("") + `
    <div class="adicional-custom">
      <div class="adicional-custom-titulo">Outro adicional</div>
      <input class="adicional-custom-nome" id="adNomeCustom" type="text" placeholder="Nome" maxlength="40" autocomplete="off" inputmode="text" />
      <div class="adicional-custom-row">
        <span class="adicional-cifrao">R$</span>
        <input class="adicional-custom-valor" id="adValorCustom" type="number" min="0" step="0.5" placeholder="0,00" inputmode="decimal" />
        <button class="adicional-custom-btn btn-primary" id="btnAdicionarCustom">✓</button>
      </div>
    </div>`;

  container.querySelectorAll(".adicional-add-btn").forEach(btn => {
    btn.addEventListener("click", () => _abrirInputAdicional(btn.dataset.idx));
  });
  container.querySelectorAll(".adicional-ok-btn").forEach(btn => {
    btn.addEventListener("click", () => _confirmarAdicionalInline(btn.dataset.idx));
  });
  container.querySelectorAll(".adicional-cancel-btn").forEach(btn => {
    btn.addEventListener("click", () => _fecharInputAdicional(btn.dataset.idx));
  });
  container.querySelectorAll(".adicional-valor-input").forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") _confirmarAdicionalInline(input.id.replace("adValor_", ""));
      if (e.key === "Escape") _fecharInputAdicional(input.id.replace("adValor_", ""));
    });
  });

  document.getElementById("btnAdicionarCustom")?.addEventListener("click", _confirmarAdicionalCustom);
  document.getElementById("adValorCustom")?.addEventListener("keydown", e => {
    if (e.key === "Enter") _confirmarAdicionalCustom();
  });
}

function _abrirInputAdicional(idx) {
  document.querySelectorAll(".adicional-valor-row").forEach(r => r.style.display = "none");
  document.querySelectorAll(".adicional-add-btn").forEach(b => b.style.display = "");
  const row = document.getElementById(`adValorRow_${idx}`);
  const btn = document.getElementById(`adBtn_${idx}`);
  const input = document.getElementById(`adValor_${idx}`);
  if (row) row.style.display = "flex";
  if (btn) btn.style.display = "none";
  if (input) { input.value = ""; input.focus(); }
}

function _fecharInputAdicional(idx) {
  const row = document.getElementById(`adValorRow_${idx}`);
  const btn = document.getElementById(`adBtn_${idx}`);
  if (row) row.style.display = "none";
  if (btn) btn.style.display = "";
}

function _confirmarAdicionalInline(idx) {
  const nome = ADICIONAIS[parseInt(idx)];
  const input = document.getElementById(`adValor_${idx}`);
  const preco = parseFloat(input?.value?.replace(",", ".") || "0");
  if (!nome) return;
  if (isNaN(preco) || preco < 0) { toast("Digite um valor válido.", "erro"); input?.focus(); return; }
  adicionarAdicionalAoPedido(nome, preco);
  _fecharInputAdicional(idx);
}

function _confirmarAdicionalCustom() {
  const nomeEl = document.getElementById("adNomeCustom");
  const valorEl = document.getElementById("adValorCustom");
  const nome = nomeEl?.value.trim();
  const preco = parseFloat(valorEl?.value?.replace(",", ".") || "0");
  if (!nome) { toast("Digite o nome do adicional.", "erro"); nomeEl?.focus(); return; }
  if (isNaN(preco) || preco < 0) { toast("Digite um valor válido.", "erro"); valorEl?.focus(); return; }
  adicionarAdicionalAoPedido(nome, preco);
  if (nomeEl) nomeEl.value = "";
  if (valorEl) valorEl.value = "";
  nomeEl?.focus();
}

function adicionarAdicionalAoPedido(nome, preco) {
  estadoMesa.pedidoAtual.push({
    prodId: `adicional_${Date.now()}`,
    nome: `+ ${nome}`,
    preco: preco,
    qty: 1,
    obs: "",
    isAdicional: true
  });
  renderPedidoAtual();
  toast(`"${nome}" adicionado`, "sucesso");
}

function _initDrawerAdicionais() {
  const btnAbrir = document.getElementById("btnAbrirAdicionais");
  const btnFechar = document.getElementById("btnFecharAdicionais");
  const drawer = document.getElementById("adicionaisDrawer");
  if (!btnAbrir || !drawer) return;
  btnAbrir.addEventListener("click", () => {
    const aberto = drawer.classList.toggle("aberto");
    btnAbrir.classList.toggle("ativo", aberto);
  });
  btnFechar?.addEventListener("click", () => {
    drawer.classList.remove("aberto");
    btnAbrir.classList.remove("ativo");
  });
}

// ── Confirmar pedido ──────────────────────────────────────
async function confirmarPedido() {
  const itens = estadoMesa.pedidoAtual;
  if (!itens.length) return;
  const btn = document.getElementById("btnConfirmarPedido");
  btn.disabled = true;
  btn.textContent = "Enviando...";

  try {
    const totalPedido = itens.reduce((acc, i) => acc + i.preco * i.qty, 0);
    const pedidoData = {
      mesaNumero: estadoMesa.numero,
      mesaId: estadoMesa.mesaId,
      mesaTipo: estadoMesa.dadosMesa?.tipo || "restaurante",
      itens: itens.map(i => ({ prodId: i.prodId, nome: i.nome, preco: i.preco, qty: i.qty, obs: i.obs || "" })),
      total: totalPedido,
      status: "Novo",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Usa runTransaction para evitar race condition quando dois dispositivos
    // confirmam pedidos simultaneamente na mesma mesa
    const mesaRef = doc(db, "mesas", estadoMesa.mesaId);

    let pedidoRef;
    await runTransaction(db, async tx => {
      const mesaSnap = await tx.get(mesaRef);
      const mesaData = mesaSnap.data() || {};
      // Cria o pedido fora da transação (addDoc não suportado dentro), mas o histórico é atômico
      pedidoRef = doc(collection(db, "pedidos")); // cria ref com ID gerado
      const novoHistorico = [...(mesaData.historicoPedidos || []), {
        pedidoId: pedidoRef.id,
        itens: pedidoData.itens,
        total: totalPedido,
        status: "Novo",
        criadoEm: new Date().toISOString()
      }];
      tx.set(pedidoRef, pedidoData);
      tx.update(mesaRef, {
        status: "ocupada",
        abertaEm: mesaData.abertaEm || serverTimestamp(),
        total: (mesaData.total || 0) + totalPedido,
        pedidosCount: (mesaData.pedidosCount || 0) + 1,
        historicoPedidos: novoHistorico
      });
    });

    estadoMesa.pedidoAtual = [];
    renderPedidoAtual();
    toast("Pedido confirmado! Enviado para a cozinha.", "sucesso");
  } catch (err) {
    console.error("[Mikami] Erro ao confirmar pedido:", err);
    toast("Erro ao confirmar pedido. Tente novamente.", "erro");
  } finally {
    btn.textContent = "Confirmar Pedido →";
    btn.disabled = estadoMesa.pedidoAtual.length === 0;
  }
}

// ── Entrega ───────────────────────────────────────────────
function _configurarAbaEntrega(mesa) {
  if (mesa.tipo !== "delivery") return;
  document.querySelectorAll(".mesa-aba-delivery").forEach(b => b.style.display = "");
  const isMobile = window.innerWidth < 768;
  if (!isMobile) {
    const col = document.querySelector(".col-entrega");
    if (col) col.style.display = "flex";
    const layout = document.querySelector(".mesa-layout");
    if (layout) layout.style.gridTemplateColumns = "1fr 280px 260px 250px";
  }
  if (mesa.entrega?.local) estadoMesa.entrega = { local: mesa.entrega.local, taxa: mesa.entrega.taxa || 0 };
  _renderLocaisEntrega(mesa.entrega?.local || "");
  _atualizarResumoEntrega();
}

function _renderLocaisEntrega(sel) {
  const c = document.getElementById("entregaLocais"); if (!c) return;
  c.innerHTML = LOCAIS_ENTREGA.map(loc => {
    const ativo = loc.nome === sel;
    return `<div class="entrega-local-item${ativo ? " ativo" : ""}" data-nome="${loc.nome}" data-taxa="${loc.taxa}">
      <span class="entrega-local-icone">${loc.icone}</span>
      <span class="entrega-local-nome">${loc.nome}</span>
      <span class="entrega-local-taxa">${loc.taxa === 0 ? "Grátis" : "R$ " + loc.taxa.toFixed(2).replace(".", ",")}</span>
    </div>`;
  }).join("");
  c.querySelectorAll(".entrega-local-item").forEach(item => {
    item.addEventListener("click", () => {
      const nome = item.dataset.nome, taxa = parseFloat(item.dataset.taxa);
      estadoMesa.entrega = { local: nome, taxa };
      _renderLocaisEntrega(nome);
      _atualizarResumoEntrega();
      updateDoc(doc(db, "mesas", estadoMesa.mesaId), { entrega: { local: nome, taxa } }).catch(() => {});
      const btn = document.getElementById("btnConfirmarEntrega");
      if (btn) btn.style.display = "";
      const conf = document.getElementById("entregaConfirmado");
      if (conf) conf.textContent = "";
    });
  });
}

function _atualizarResumoEntrega() {
  const mesa = estadoMesa.dadosMesa; if (!mesa) return;
  const taxa = estadoMesa.entrega?.taxa || 0;
  const sub = (mesa.historicoPedidos || []).reduce((a, p) => a + (p.total || 0), 0);
  const tot = sub + taxa;
  const fmt = v => "R$ " + v.toFixed(2).replace(".", ",");
  const el = id => document.getElementById(id);
  if (el("entregaResumo")) el("entregaResumo").style.display = "";
  if (el("entregaSubtotal")) el("entregaSubtotal").textContent = fmt(sub);
  if (el("entregaTaxaDisplay")) el("entregaTaxaDisplay").textContent = taxa === 0 ? "Grátis" : fmt(taxa);
  if (el("entregaTotalDisplay")) el("entregaTotalDisplay").textContent = fmt(tot);
  if (el("contaTotalBadge")) el("contaTotalBadge").textContent = fmt(tot);
  if (el("contaTotalFinal")) el("contaTotalFinal").textContent = fmt(tot);
  if (el("modalTotalCobrar")) el("modalTotalCobrar").textContent = fmt(tot);
}

async function _confirmarEntrega() {
  const local = estadoMesa.entrega?.local, taxa = estadoMesa.entrega?.taxa ?? 0;
  if (!local) { toast("Selecione um local de entrega.", "erro"); return; }
  const btn = document.getElementById("btnConfirmarEntrega");
  if (btn) { btn.disabled = true; btn.textContent = "Confirmando..."; }
  try {
    await updateDoc(doc(db, "mesas", estadoMesa.mesaId), { entrega: { local, taxa, confirmado: true } });
    const conf = document.getElementById("entregaConfirmado");
    if (conf) conf.textContent = "✓ Entrega confirmada!";
    if (btn) { btn.style.display = "none"; btn.disabled = false; btn.textContent = "✅ Confirmar Entrega"; }
    toast("Entrega confirmada!", "sucesso");
  } catch (e) {
    toast("Erro ao confirmar.", "erro");
    if (btn) { btn.disabled = false; btn.textContent = "✅ Confirmar Entrega"; }
  }
}

function atualizarHeaderMesa() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa) return;
  const statusMap = { livre: "Livre", ocupada: "Ocupada", aguardando: "Aguardando Pagto." };
  const badge = document.getElementById("mesaStatusBadge");
  if (badge) { badge.textContent = statusMap[mesa.status] || mesa.status; badge.className = `mesa-status-badge ${mesa.status}`; }
  const abEl = document.getElementById("mesaAbertura");
  if (abEl) abEl.textContent = mesa.abertaEm ? `Aberta às ${fmtHora(mesa.abertaEm)}` : "Mesa livre";

  const totalHistorico = (mesa.historicoPedidos || []).reduce((a, p) => a + (p.total || 0), 0);
  const total = totalHistorico || mesa.total || 0;
  const el = id => document.getElementById(id);
  if (el("contaTotalBadge")) el("contaTotalBadge").textContent = fmtMoeda(total);
  if (el("contaTotalFinal")) el("contaTotalFinal").textContent = fmtMoeda(total);
  if (el("modalTotalCobrar")) el("modalTotalCobrar").textContent = fmtMoeda(total);
}

function renderConta() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa) return;
  const container = document.getElementById("contaHistorico");
  const historico = mesa.historicoPedidos || [];

  if (!historico.length) {
    container.innerHTML = `<div class="conta-vazia"><span>Nenhum pedido confirmado ainda.</span></div>`;
    return;
  }

  const badgeClass = {
    "Novo": "badge-novo", "Em preparo": "badge-preparo",
    "Pronto": "badge-pronto", "Entregue": "badge-entregue"
  };

  container.innerHTML = historico.map((pedido, idx) => {
    const itemsHtml = (pedido.itens || []).map(item => `
      <div class="conta-item-linha">
        <span class="conta-item-nome">${esc(item.nome)}</span>
        <span class="conta-item-qty">${item.qty}x</span>
        <span class="conta-item-val">${fmtMoeda(item.preco * item.qty)}</span>
      </div>
      ${item.obs ? `<div class="conta-item-obs">↳ ${esc(item.obs)}</div>` : ""}
    `).join("");

    const hora = pedido.criadoEm
      ? new Date(pedido.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";

    return `
      <div class="conta-pedido-grupo">
        <div class="conta-pedido-header">
          <span class="conta-pedido-seq">Pedido #${idx + 1}</span>
          <span class="status-badge ${badgeClass[pedido.status] || "badge-novo"}">${pedido.status || "Novo"}</span>
          <span class="conta-pedido-hora">${hora}</span>
          ${pedido.status !== "Entregue" ? `<button class="btn-editar-pedido-conta" data-pedido-id="${pedido.pedidoId}" title="Editar pedido">✏️</button>` : ""}
        </div>
        ${itemsHtml}
        <div class="conta-item-linha" style="margin-top:0.3rem;border-top:1px solid var(--preto-borda);padding-top:0.3rem">
          <span class="conta-item-nome" style="color:var(--cinza-texto)">Subtotal</span>
          <span></span>
          <span class="conta-item-val">${fmtMoeda(pedido.total || 0)}</span>
        </div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;

  container.querySelectorAll(".btn-editar-pedido-conta").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEditar(btn.dataset.pedidoId));
  });
}

// ── Impressão ─────────────────────────────────────────────
function imprimirCozinha() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || !mesa.historicoPedidos?.length) { toast("Nenhum pedido para imprimir.", "erro"); return; }

  const pedidosParaImprimir = mesa.historicoPedidos.filter(p => p.status === "Novo" || p.status === "Em preparo");
  const alvo = pedidosParaImprimir.length > 0 ? pedidosParaImprimir : [mesa.historicoPedidos[mesa.historicoPedidos.length - 1]];

  const pedidosHtml = alvo.map((pedido, idx) => {
    const itensHtml = (pedido.itens || []).map(item => `
      <div class="print-item"><span>${item.qty}x ${item.nome}</span></div>
      ${item.obs ? `<div class="print-item-obs">→ ${item.obs}</div>` : ""}
    `).join("");
    return `<div class="print-section-title">PEDIDO ${idx + 1}</div>${itensHtml}`;
  }).join("");

  document.getElementById("printArea").innerHTML = `
    <div class="print-header">
      <h2>MIKAMI SUSHI</h2>
      <p>— PEDIDO COZINHA —</p>
      <p>${estadoMesa.dadosMesa?.tipo === "delivery" ? "🛵 Delivery" : "Mesa"}: <strong>${estadoMesa.numero}</strong></p>
      ${estadoMesa.dadosMesa?.tipo === "delivery" && estadoMesa.dadosMesa?.entrega?.local ? `<p>📍 ${estadoMesa.dadosMesa.entrega.local}</p>` : ""}
      <p>${new Date().toLocaleString("pt-BR")}</p>
    </div>
    ${pedidosHtml}
    <div class="print-footer">Impresso em ${new Date().toLocaleTimeString("pt-BR")}</div>
  `;
  window.print();
}

function imprimirConta() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || !mesa.historicoPedidos?.length) { toast("Nenhum item na conta.", "erro"); return; }

  const todosItens = [];
  (mesa.historicoPedidos || []).forEach(pedido => {
    (pedido.itens || []).forEach(item => {
      const exist = todosItens.find(i => i.nome === item.nome && !item.obs && !i.obs);
      if (exist) { exist.qty += item.qty; exist.subtotal += item.preco * item.qty; }
      else todosItens.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty, obs: item.obs });
    });
  });

  const itensHtml = todosItens.map(item => `
    <div class="print-item"><span>${item.qty}x ${item.nome}</span><span>${fmtMoeda(item.subtotal)}</span></div>
    ${item.obs ? `<div class="print-item-obs">→ ${item.obs}</div>` : ""}
  `).join("");

  document.getElementById("printArea").innerHTML = `
    <div class="print-header">
      <h2>MIKAMI SUSHI</h2>
      <p>— PRÉ-CONTA —</p>
      <p>${estadoMesa.dadosMesa?.tipo === "delivery" ? "🛵 Delivery" : "Mesa"}: <strong>${estadoMesa.numero}</strong></p>
      ${estadoMesa.dadosMesa?.tipo === "delivery" && estadoMesa.dadosMesa?.entrega?.local ? `<p>📍 ${estadoMesa.dadosMesa.entrega.local}${estadoMesa.dadosMesa.entrega.taxa > 0 ? " — Taxa: R$ " + estadoMesa.dadosMesa.entrega.taxa.toFixed(2).replace(".", ",") : ""}</p>` : ""}
      <p>${new Date().toLocaleString("pt-BR")}</p>
    </div>
    <div class="print-section-title">ITENS CONSUMIDOS</div>
    ${itensHtml}
    <div class="print-total">
      <span>TOTAL</span>
      <span>${fmtMoeda((mesa.historicoPedidos || []).reduce((a, p) => a + (p.total || 0), 0) + (estadoMesa.entrega?.taxa || 0))}</span>
    </div>
    <div class="print-footer">Obrigado pela visita!<br>Mikami Sushi</div>
  `;
  window.print();
}

// ── Fechar mesa ───────────────────────────────────────────
function abrirModalFechar() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || mesa.status === "livre") { toast("Mesa já está livre.", "info"); return; }
  const historico = mesa.historicoPedidos || [];
  const totalReal = historico.reduce((acc, p) => acc + (p.total || 0), 0) + (estadoMesa.entrega?.taxa || 0);
  if (totalReal <= 0) { toast("Conta zerada. Nada a fechar.", "info"); return; }
  // FIX: atualiza o display do modal com o total real
  const el = document.getElementById("modalTotalCobrar");
  if (el) el.textContent = fmtMoeda(totalReal);
  document.getElementById("modalFecharMesa").classList.add("open");
}

function fecharModal() {
  document.getElementById("modalFecharMesa").classList.remove("open");
  document.querySelectorAll(".pagamento-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("btnConfirmarFechar").disabled = true;
  const tabUnico = document.getElementById("tabPagUnico");
  const tabDivid = document.getElementById("tabPagDividido");
  if (tabUnico) { tabUnico.classList.add("active"); tabDivid.classList.remove("active"); }
  const secUnico = document.getElementById("secPagUnico");
  const secDivid = document.getElementById("secPagDividido");
  if (secUnico) { secUnico.style.display = ""; secDivid.style.display = "none"; }
  document.querySelectorAll(".div-valor-input").forEach(i => i.value = "");
  document.querySelectorAll(".div-toggle").forEach(b => b.classList.remove("active"));
  atualizarRestante();
}

async function fecharMesa() {
  const btnFechar = document.getElementById("btnConfirmarFechar");
  if (btnFechar.disabled) return;

  const isDividido = document.getElementById("tabPagDividido")?.classList.contains("active");
  let formaPagamento = "";
  let pagamentos = [];

  if (isDividido) {
    document.querySelectorAll(".div-toggle.active").forEach(btn => {
      const metodo = btn.dataset.metodo;
      const input = document.querySelector(`.div-valor-input[data-metodo="${metodo}"]`);
      const val = parseFloat(input?.value?.replace(",", ".") || "0");
      if (val > 0) pagamentos.push({ metodo, valor: val });
    });
    if (!pagamentos.length) { toast("Selecione ao menos um método de pagamento.", "erro"); return; }
    formaPagamento = pagamentos.map(p => `${p.metodo} (${fmtMoeda(p.valor)})`).join(" + ");
  } else {
    const metodoBtn = document.querySelector(".pagamento-btn.selected");
    if (!metodoBtn) return;
    formaPagamento = metodoBtn.dataset.metodo;
  }

  btnFechar.disabled = true;
  btnFechar.textContent = "Fechando...";

  try {
    const mesa = estadoMesa.dadosMesa;
    const historico = mesa.historicoPedidos || [];
    // FIX: sempre recalcula o total a partir do histórico (não usa mesa.total)
    const totalReal = historico.reduce((acc, p) => acc + (p.total || 0), 0) + (estadoMesa.dadosMesa?.entrega?.taxa || 0);

    if (!isDividido) pagamentos = [{ metodo: formaPagamento, valor: totalReal }];

    await addDoc(collection(db, "vendas"), {
      mesaNumero: estadoMesa.numero,
      mesaId: estadoMesa.mesaId,
      itens: historico.flatMap(p => p.itens || []),
      total: totalReal,
      formaPagamento,
      pagamentos,
      fechadoEm: serverTimestamp()
    });

    const pedidosSnap = await getDocs(query(collection(db, "pedidos"), where("mesaId", "==", estadoMesa.mesaId)));
    await Promise.all(pedidosSnap.docs.map(d => updateDoc(d.ref, { status: "Entregue", updatedAt: serverTimestamp() })));

    await updateDoc(doc(db, "mesas", estadoMesa.mesaId), {
      status: "livre", abertaEm: null, total: 0, pedidosCount: 0, historicoPedidos: []
    });

    fecharModal();
    toast("Mesa fechada com sucesso!", "sucesso");
    setTimeout(() => window.location.href = "index.html", 1500);
  } catch (err) {
    console.error("[Mikami] Erro ao fechar mesa:", err);
    toast("Erro ao fechar mesa. Tente novamente.", "erro");
    btnFechar.disabled = false;
    btnFechar.textContent = "Confirmar Fechamento";
  }
}

// ── Pagamento dividido ────────────────────────────────────
function atualizarRestante() {
  const mesa = estadoMesa.dadosMesa;
  const historico = mesa?.historicoPedidos || [];
  // FIX: usa totalReal consistente com fecharMesa()
  const total = historico.reduce((acc, p) => acc + (p.total || 0), 0) + (estadoMesa.entrega?.taxa || 0);
  let distribuido = 0;
  document.querySelectorAll(".div-toggle.active").forEach(btn => {
    const metodo = btn.dataset.metodo;
    const input = document.querySelector(`.div-valor-input[data-metodo="${metodo}"]`);
    distribuido += parseFloat(input?.value?.replace(",", ".") || "0") || 0;
  });
  const restante = total - distribuido;
  const el = document.getElementById("divRestante");
  if (el) {
    el.textContent = restante > 0.009
      ? `Faltam distribuir: ${fmtMoeda(restante)}`
      : restante < -0.009 ? `Excedeu em: ${fmtMoeda(Math.abs(restante))}` : "✓ Total distribuído";
    el.style.color = Math.abs(restante) < 0.01 ? "var(--verde)" : "var(--vermelho-soft)";
  }
  const btnConfirmar = document.getElementById("btnConfirmarFechar");
  if (btnConfirmar && document.getElementById("tabPagDividido")?.classList.contains("active")) {
    btnConfirmar.disabled = Math.abs(restante) > 0.01;
  }
}

function initModalPagamento() {
  const tabUnico = document.getElementById("tabPagUnico");
  const tabDivid = document.getElementById("tabPagDividido");
  const secUnico = document.getElementById("secPagUnico");
  const secDivid = document.getElementById("secPagDividido");
  if (!tabUnico) return;

  tabUnico.addEventListener("click", () => {
    tabUnico.classList.add("active"); tabDivid.classList.remove("active");
    secUnico.style.display = ""; secDivid.style.display = "none";
    const btnConfirmar = document.getElementById("btnConfirmarFechar");
    btnConfirmar.disabled = !document.querySelector(".pagamento-btn.selected");
  });

  tabDivid.addEventListener("click", () => {
    tabDivid.classList.add("active"); tabUnico.classList.remove("active");
    secDivid.style.display = ""; secUnico.style.display = "none";
    atualizarRestante();
  });

  document.querySelectorAll(".div-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const metodo = btn.dataset.metodo;
      const inputRow = document.getElementById(`divRow_${metodo}`);
      if (inputRow) inputRow.style.display = btn.classList.contains("active") ? "flex" : "none";
      atualizarRestante();
    });
  });

  document.querySelectorAll(".div-valor-input").forEach(input => {
    input.addEventListener("input", atualizarRestante);
  });
}

// ── Modal Editar Pedido ───────────────────────────────────
let pedidoEmEdicao = null;

async function abrirModalEditar(pedidoId) {
  if (!pedidoId) return;
  try {
    const snap = await getDoc(doc(db, "pedidos", pedidoId));
    if (!snap.exists()) { toast("Pedido não encontrado.", "erro"); return; }
    pedidoEmEdicao = { id: pedidoId, ...snap.data() };
    pedidoEmEdicao.itens = pedidoEmEdicao.itens.map(i => ({ ...i }));
    renderModalEditar();
    // FIX: detecta a página para abrir o modal correto
    const isPaginaMesa = document.body.classList.contains("page-mesa");
    const modalId = isPaginaMesa ? "modalEditarPedido" : "modalEditarPedidoCozinha";
    const _modal = document.getElementById(modalId);
    if (_modal) _modal.classList.add("open");
    else { toast("Erro ao abrir edição.", "erro"); return; }
  } catch (err) {
    console.error("[Mikami] Edição:", err);
    toast("Erro ao abrir edição.", "erro");
  }
}

async function abrirModalEditarCozinha(pedidoId) {
  await abrirModalEditar(pedidoId);
}

function renderModalEditar() {
  if (!pedidoEmEdicao) return;
  const isPaginaMesa = document.body.classList.contains("page-mesa");
  const container = document.getElementById(isPaginaMesa ? "editarItensLista" : "editarItensListaCozinha");
  if (!container) return;
  const itens = pedidoEmEdicao.itens;
  const titulo = document.getElementById(isPaginaMesa ? "editarPedidoTitulo" : "editarPedidoTituloCozinha");
  if (titulo) titulo.textContent = `Editar Pedido — Mesa ${pedidoEmEdicao.mesaNumero}`;

  if (!itens.length) {
    container.innerHTML = `<p style="color:var(--cinza-texto);text-align:center;padding:1rem">Nenhum item</p>`;
    return;
  }

  container.innerHTML = itens.map((item, idx) => `
    <div class="editar-item-row" data-idx="${idx}">
      <div class="editar-item-nome">${esc(item.nome)}</div>
      <div class="editar-item-controles">
        <button class="qty-btn editar-dec" data-idx="${idx}">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn editar-inc" data-idx="${idx}">+</button>
        <span class="editar-item-preco">${fmtMoeda(item.preco * item.qty)}</span>
        <button class="remove-item-btn editar-remove" data-idx="${idx}">✕</button>
      </div>
      ${item.obs ? `<div class="conta-item-obs">↳ ${esc(item.obs)}</div>` : ""}
    </div>
  `).join("");

  const total = itens.reduce((a, i) => a + i.preco * i.qty, 0);
  const _elTotal = document.getElementById(isPaginaMesa ? "editarTotal" : "editarTotalCozinha");
  if (_elTotal) _elTotal.textContent = fmtMoeda(total);

  container.querySelectorAll(".editar-dec").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      pedidoEmEdicao.itens[idx].qty--;
      if (pedidoEmEdicao.itens[idx].qty <= 0) pedidoEmEdicao.itens.splice(idx, 1);
      renderModalEditar();
    });
  });
  container.querySelectorAll(".editar-inc").forEach(btn => {
    btn.addEventListener("click", () => { pedidoEmEdicao.itens[parseInt(btn.dataset.idx)].qty++; renderModalEditar(); });
  });
  container.querySelectorAll(".editar-remove").forEach(btn => {
    btn.addEventListener("click", () => { pedidoEmEdicao.itens.splice(parseInt(btn.dataset.idx), 1); renderModalEditar(); });
  });
}

async function salvarEdicaoPedido() {
  if (!pedidoEmEdicao) return;
  const isPaginaMesa = document.body.classList.contains("page-mesa");
  const btnSalvar = document.getElementById(isPaginaMesa ? "btnSalvarEdicao" : "btnSalvarEdicaoCozinha");
  if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = "Salvando..."; }

  try {
    const itensNovos = pedidoEmEdicao.itens;
    const novoTotal = itensNovos.reduce((a, i) => a + i.preco * i.qty, 0);
    const totalAntigo = pedidoEmEdicao.total || 0;

    if (!itensNovos.length) {
      await excluirPedido(pedidoEmEdicao.id, pedidoEmEdicao.mesaId, totalAntigo);
      fecharModalEditar();
      return;
    }

    await updateDoc(doc(db, "pedidos", pedidoEmEdicao.id), { itens: itensNovos, total: novoTotal, updatedAt: serverTimestamp() });

    if (pedidoEmEdicao.mesaId) {
      const mesaRef = doc(db, "mesas", pedidoEmEdicao.mesaId);
      const mesaSnap = await getDoc(mesaRef);
      if (mesaSnap.exists()) {
        const mesaData = mesaSnap.data();
        const historico = (mesaData.historicoPedidos || []).map(p =>
          p.pedidoId === pedidoEmEdicao.id ? { ...p, itens: itensNovos, total: novoTotal } : p
        );
        const totalRecalculado = historico.reduce((a, p) => a + (p.total || 0), 0);
        await updateDoc(mesaRef, { historicoPedidos: historico, total: Math.max(0, totalRecalculado) });
      }
    }

    toast("Pedido atualizado!", "sucesso");
    fecharModalEditar();
  } catch (err) {
    console.error(err);
    toast("Erro ao salvar edição.", "erro");
    if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = "Salvar"; }
  }
}

function fecharModalEditar() {
  pedidoEmEdicao = null;
  ["modalEditarPedido", "modalEditarPedidoCozinha"].forEach(id => document.getElementById(id)?.classList.remove("open"));
  ["btnSalvarEdicao", "btnSalvarEdicaoCozinha"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) { btn.disabled = false; btn.textContent = "Salvar"; }
  });
}

// ============================================================
// 5. PÁGINA: COZINHA
// ============================================================
let filtroAtivo = "todos";
let pedidosCached = [];

function _bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}
let _idsConhecidos = new Set();
let _primeiraLeituraCozinha = true;

function initCozinha() {
  iniciarRelogio();
  document.getElementById("btnCancelarEdicaoCozinha")?.addEventListener("click", fecharModalEditar);
  document.getElementById("btnSalvarEdicaoCozinha")?.addEventListener("click", salvarEdicaoPedido);

  // Fecha modal cozinha ao clicar no overlay
  document.getElementById("modalEditarPedidoCozinha")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) fecharModalEditar();
  });

  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCozinha(pedidosCached);
    });
  });

  const _inicioCozinha = new Date();
  _inicioCozinha.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, "pedidos"),
    where("createdAt", ">=", Timestamp.fromDate(_inicioCozinha)),
    orderBy("createdAt", "desc")
  );

  let _throttleCozinha = null;
  const _unsubCoz = onSnapshot(q, snap => {
    const dados = [];
    snap.forEach(d => dados.push({ id: d.id, ...d.data() }));

    let temNovo = false;
    dados.forEach(p => {
      if (!_primeiraLeituraCozinha && p.status === "Novo" && !_idsConhecidos.has(p.id)) temNovo = true;
      _idsConhecidos.add(p.id);
    });
    _primeiraLeituraCozinha = false;
    if (temNovo) _bip();

    if (_throttleCozinha) return;
    _throttleCozinha = setTimeout(() => {
      _throttleCozinha = null;
      pedidosCached = dados;
      renderCozinha(pedidosCached);
      const ativos = pedidosCached.filter(p => p.status !== "Entregue");
      const el = document.getElementById("pedidosAtivosCount");
      if (el) el.textContent = `${ativos.length} pedido(s) ativo(s)`;
    }, 200);
  });
  window.addEventListener("pagehide", () => { _unsubCoz(); clearTimeout(_throttleCozinha); clearInterval(_intervalTempo); }, { once: true });

  const _intervalTempo = setInterval(() => {
    document.querySelectorAll(".pedido-card-tempo[data-ts]").forEach(el => {
      const ts = parseInt(el.dataset.ts);
      if (ts) el.textContent = fmtTempo({ toDate: () => new Date(ts) });
    });
  }, 30000);
}

function renderCozinha(pedidos) {
  const grid = document.getElementById("pedidosGrid");
  let filtrados = pedidos;
  if (filtroAtivo !== "todos") filtrados = pedidos.filter(p => p.status === filtroAtivo);

  if (!filtrados.length) {
    grid.innerHTML = `
      <div class="loading-mesas" style="grid-column:1/-1">
        <span style="font-size:2rem">🍣</span>
        <p>${filtroAtivo === "todos" ? "Nenhum pedido ativo." : `Nenhum pedido com status "${filtroAtivo}".`}</p>
      </div>`;
    return;
  }

  const statusClass = { "Novo": "status-novo", "Em preparo": "status-preparo", "Pronto": "status-pronto", "Entregue": "status-entregue" };
  const badgeClass = { "Novo": "badge-novo", "Em preparo": "badge-preparo", "Pronto": "badge-pronto", "Entregue": "badge-entregue" };

  grid.innerHTML = filtrados.map(pedido => {
    const tsMs = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : null;
    const itensHtml = (pedido.itens || []).map(item => `
      <div class="pedido-card-item">
        <span class="pedido-card-item-qty">${Number(item.qty)}x</span>
        <span class="pedido-card-item-nome">${esc(item.nome)}</span>
        ${item.obs ? `<span class="pedido-card-item-obs">→ ${esc(item.obs)}</span>` : ""}
      </div>
    `).join("");

    let botoesHtml = "";
    if (pedido.status === "Novo") {
      botoesHtml = `
        <button class="btn-secondary" data-id="${pedido.id}" data-status="Em preparo">▶ Em preparo</button>
        <button class="btn-editar-cozinha btn-secondary" data-pedido-id="${pedido.id}">✏️</button>
      `;
    } else if (pedido.status === "Em preparo") {
      botoesHtml = `
        <button class="btn-primary" data-id="${pedido.id}" data-status="Pronto">✓ Marcar Pronto</button>
        <button class="btn-editar-cozinha btn-secondary" data-pedido-id="${pedido.id}">✏️</button>
      `;
    } else if (pedido.status === "Pronto") {
      botoesHtml = `<button class="btn-secondary" data-id="${pedido.id}" data-status="Entregue">✓ Marcar Entregue</button>`;
    }

    return `
      <div class="pedido-card ${statusClass[pedido.status] || "status-novo"}" data-pedido-id="${pedido.id}">
        <div class="pedido-card-header">
          <div>
            <div class="pedido-card-mesa">${pedido.mesaTipo === "delivery" ? "🛵 Delivery " + Number(pedido.mesaNumero) : "Mesa " + Number(pedido.mesaNumero)}</div>
            <div><span class="status-badge ${badgeClass[pedido.status] || "badge-novo"}">${esc(pedido.status || "Novo")}</span></div>
          </div>
          <div class="pedido-card-meta">
            <span class="pedido-card-hora">${pedido.createdAt ? fmtHora(pedido.createdAt) : "—"}</span>
            <span class="pedido-card-tempo" data-ts="${tsMs || ""}">${tsMs ? fmtTempo({ toDate: () => new Date(tsMs) }) : ""}</span>
          </div>
        </div>
        <div class="pedido-card-itens">${itensHtml}</div>
        <div class="pedido-card-acoes">
          ${botoesHtml}
          <button class="btn-excluir-pedido" data-excluir-id="${pedido.id}" data-mesa-id="${pedido.mesaId}" data-total="${pedido.total || 0}" title="Excluir pedido">🗑</button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-id][data-status]").forEach(btn => {
    btn.addEventListener("click", () => atualizarStatusPedido(btn.dataset.id, btn.dataset.status));
  });
  grid.querySelectorAll(".btn-excluir-pedido").forEach(btn => {
    btn.addEventListener("click", () => excluirPedido(btn.dataset.excluirId, btn.dataset.mesaId, parseFloat(btn.dataset.total)));
  });
  grid.querySelectorAll(".btn-editar-cozinha").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEditarCozinha(btn.dataset.pedidoId));
  });
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
  try {
    await updateDoc(doc(db, "pedidos", pedidoId), { status: novoStatus, updatedAt: serverTimestamp() });
    const pedidoSnap = await getDoc(doc(db, "pedidos", pedidoId));
    if (!pedidoSnap.exists()) return;
    const pedidoData = pedidoSnap.data();
    const mesaRef = doc(db, "mesas", pedidoData.mesaId);
    const mesaSnap = await getDoc(mesaRef);
    if (!mesaSnap.exists()) { toast(`Pedido: ${novoStatus}`, "sucesso"); return; }
    const historico = (mesaSnap.data().historicoPedidos || []).map(p =>
      p.pedidoId === pedidoId ? { ...p, status: novoStatus } : p
    );
    await updateDoc(mesaRef, { historicoPedidos: historico });
    toast(`Pedido: ${novoStatus}`, "sucesso");
  } catch (err) {
    console.error("[Mikami] Erro ao atualizar pedido:", err);
    toast("Erro ao atualizar pedido.", "erro");
  }
}

async function excluirPedido(pedidoId, mesaId, totalPedido) {
  const confirmado = await _confirmarAcao("Excluir este pedido? Esta ação não pode ser desfeita.");
  if (!confirmado) return;
  try {
    await deleteDoc(doc(db, "pedidos", pedidoId));
    if (mesaId) {
      const mesaRef = doc(db, "mesas", mesaId);
      const mesaSnap = await getDoc(mesaRef);
      if (mesaSnap.exists()) {
        const mesaData = mesaSnap.data();
        const historico = (mesaData.historicoPedidos || []).filter(p => p.pedidoId !== pedidoId);
        // Recalcula total a partir do histórico para evitar dessincronia
        const novoTotal = historico.reduce((a, p) => a + (p.total || 0), 0);
        const novoStatus = historico.length === 0 ? "livre" : mesaData.status;
        await updateDoc(mesaRef, {
          historicoPedidos: historico,
          total: novoTotal,
          pedidosCount: Math.max(0, (mesaData.pedidosCount || 1) - 1),
          status: novoStatus,
          abertaEm: novoStatus === "livre" ? null : mesaData.abertaEm
        });
      }
    }
    toast("Pedido excluído.", "sucesso");
  } catch (err) {
    console.error("[Mikami] Erro ao excluir pedido:", err);
    toast("Erro ao excluir pedido.", "erro");
  }
}

// ============================================================
// 6. PÁGINA: RELATÓRIO
// ============================================================
let unsubRelatorio = null;
let vendasAtuais = [];

// ── Autenticação do relatório ─────────────────────────────
// SEGURANÇA: A senha NÃO é armazenada no client-side.
// Configure o hash SHA-256 da senha como atributo data-hash
// no <html> ou em uma <meta name="report-hash"> do relatorio.html.
// Exemplo de geração (Node.js):
//   require('crypto').createHash('sha256').update('suasenha').digest('hex')
// Adicione no relatorio.html:
//   <meta name="report-hash" content="SEU_HASH_SHA256_AQUI">

let _autenticado = false;

async function _hashSenha(senha) {
  const encoded = new TextEncoder().encode(senha);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fazerLogin(senha) {
  const metaEl = document.querySelector('meta[name="report-hash"]');
  const hashEsperado = metaEl?.content?.trim();
  if (!hashEsperado) {
    console.error("[Mikami] report-hash não configurado no relatorio.html");
    return false;
  }
  const hashDigitado = await _hashSenha(senha);
  if (hashDigitado === hashEsperado) { _autenticado = true; return true; }
  return false;
}

function fazerLogout() { _autenticado = false; window.location.reload(); }

function mostrarTelaLogin() {
  const m = document.getElementById("relatorioMain"); if (!m) return;
  m.innerHTML = `
    <div class="login-box">
      <div class="login-icon">🔐</div>
      <h2>Área Restrita</h2>
      <p>Digite a senha para acessar o Relatório.</p>
      <div class="login-campo">
        <input type="password" id="senhaInput" placeholder="Senha" autocomplete="off" />
        <button class="btn-primary btn-login" id="btnLogin">Entrar</button>
      </div>
      <div class="login-erro" id="loginErro"></div>
    </div>`;
  const inp = document.getElementById("senhaInput"), btn = document.getElementById("btnLogin"), err = document.getElementById("loginErro");
  async function t() {
    if (await fazerLogin(inp.value.trim())) { mostrarConteudoRelatorio(); }
    else { err.textContent = "Senha incorreta."; inp.value = ""; inp.focus(); setTimeout(() => { err.textContent = ""; }, 2000); }
  }
  btn.addEventListener("click", t);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") t(); });
  inp.focus();
}

function mostrarConteudoRelatorio() {
  const m = document.getElementById("relatorioMain"), t = document.getElementById("tplRelatorio");
  if (m && t) { m.innerHTML = ""; m.appendChild(t.content.cloneNode(true)); }
  document.getElementById("btnLogout")?.addEventListener("click", fazerLogout);
  _iniciarConteudoRelatorio();
}

// FIX: initRelatorio agora chama corretamente as funções de login/conteúdo
function initRelatorio() {
  iniciarRelogio();
  if (_autenticado) { mostrarConteudoRelatorio(); } else { mostrarTelaLogin(); }
}

function _iniciarConteudoRelatorio() {
  const _h = new Date();
  const _dataStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hoje = _dataStr(_h);
  const inputData = document.getElementById("filtroData");
  if (!inputData) return;
  inputData.value = hoje;

  function _setData(str) { inputData.value = str; escutarVendas(str); }

  inputData.addEventListener("change", () => escutarVendas(inputData.value));
  document.getElementById("btnHoje")?.addEventListener("click", () => _setData(hoje));
  document.getElementById("btnOntem")?.addEventListener("click", () => {
    const d = new Date(_h); d.setDate(d.getDate() - 1); _setData(_dataStr(d));
  });
  document.getElementById("btnAnteOntem")?.addEventListener("click", () => {
    const d = new Date(_h); d.setDate(d.getDate() - 2); _setData(_dataStr(d));
  });
  document.getElementById("btn7dias")?.addEventListener("click", () => {
    const d = new Date(_h); d.setDate(d.getDate() - 6); _setData(_dataStr(d));
  });
  document.getElementById("btnImprimirRelatorio")?.addEventListener("click", () => {
    imprimirRelatorio(inputData.value, vendasAtuais);
  });

  escutarVendas(hoje);
  initFaturamento();
  window.addEventListener("pagehide", () => { if (unsubRelatorio) unsubRelatorio(); }, { once: true });
}

function escutarVendas(dataStr) {
  if (unsubRelatorio) { unsubRelatorio(); unsubRelatorio = null; }

  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0);
  const fim = new Date(ano, mes - 1, dia, 23, 59, 59);

  const q = query(
    collection(db, "vendas"),
    where("fechadoEm", ">=", Timestamp.fromDate(inicio)),
    where("fechadoEm", "<=", Timestamp.fromDate(fim)),
    orderBy("fechadoEm", "desc")
  );

  const container = document.getElementById("vendasLista");
  if (container) container.innerHTML = `<div class="loading-mesas"><div class="loading-spinner"></div><p>Carregando...</p></div>`;

  unsubRelatorio = onSnapshot(q, snap => {
    const vendas = [];
    snap.forEach(d => vendas.push({ id: d.id, ...d.data() }));
    vendasAtuais = vendas;
    renderRelatorio(vendas);
  }, err => {
    console.error("[Mikami] Erro ao carregar vendas:", err);
    toast("Erro ao carregar relatório.", "erro");
  });
}

function renderRelatorio(vendas) {
  const totalDia = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdMesas = vendas.length;
  const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

  const el = id => document.getElementById(id);
  if (el("resumoTotal")) el("resumoTotal").textContent = fmtMoeda(totalDia);
  if (el("resumoMesas")) el("resumoMesas").textContent = qtdMesas;
  if (el("resumoTicket")) el("resumoTicket").textContent = fmtMoeda(ticketMed);

  const porPag = {};
  vendas.forEach(v => { const met = v.formaPagamento || "Outros"; porPag[met] = (porPag[met] || 0) + (v.total || 0); });
  const breakdown = el("pagamentosBreakdown");
  if (breakdown) {
    breakdown.innerHTML = Object.keys(porPag).length === 0
      ? `<span class="resumo-label">Nenhum pagamento</span>`
      : Object.entries(porPag).map(([met, val]) => `
        <div class="pag-linha">
          <span class="pag-metodo">${esc(met)}</span>
          <span class="pag-valor">${fmtMoeda(val)}</span>
        </div>`).join("");
  }

  const container = el("vendasLista");
  if (!container) return;

  if (!vendas.length) {
    container.innerHTML = `
      <div class="loading-mesas">
        <span style="font-size:2rem">📋</span>
        <p>Nenhuma venda registrada nessa data.</p>
      </div>`;
    _renderGraficoItensDia([]);
    return;
  }

  container.innerHTML = vendas.map(venda => {
    const itensAgrupados = [];
    (venda.itens || []).forEach(item => {
      const ex = itensAgrupados.find(i => i.nome === item.nome);
      if (ex) { ex.qty += item.qty; ex.subtotal += item.preco * item.qty; }
      else itensAgrupados.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty });
    });

      const itensHtml = itensAgrupados.map(item => `
      <div class="venda-item-linha">
        <span class="venda-item-nome">${esc(item.nome)}</span>
        <span class="venda-item-qty">${Number(item.qty)}x</span>
        <span class="venda-item-val">${fmtMoeda(item.subtotal)}</span>
      </div>
    `).join("");

    return `
      <div class="venda-card">
        <div class="venda-card-header">
          <span class="venda-mesa">Mesa ${esc(String(venda.mesaNumero))}</span>
          <span class="venda-hora">${fmtDataHora(venda.fechadoEm)}</span>
          <span class="venda-pagamento">${esc(venda.formaPagamento || "—")}</span>
          <span class="venda-total-valor">${fmtMoeda(venda.total || 0)}</span>
          <button class="btn-excluir-venda" data-venda-id="${venda.id}" title="Excluir registro">🗑 Excluir</button>
        </div>
        <div class="venda-itens-lista">${itensHtml}</div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-excluir-venda").forEach(btn => {
    btn.addEventListener("click", () => excluirVenda(btn.dataset.vendaId));
  });

  // FIX: gráfico de produtos agora renderiza no container do template, sem criar elemento dinamicamente
  _renderGraficoItensDia(vendas);
}

// ── Gráfico de produtos mais vendidos ────────────────────
function _renderGraficoItensDia(vendas) {
  const wrap = document.getElementById("chartItensDiaWrap");
  if (!wrap) return;

  const contagemItens = {};
  vendas.forEach(v => {
    (v.itens || []).forEach(item => {
      const nome = item.nome || "?";
      contagemItens[nome] = (contagemItens[nome] || 0) + (item.qty || 1);
    });
  });

  const sorted = Object.entries(contagemItens).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (!sorted.length) { wrap.style.display = "none"; return; }
  wrap.style.display = "";

  const labels = sorted.map(([n]) => n);
  const values = sorted.map(([, q]) => q);
  const total = values.reduce((a, b) => a + b, 0);

  // Cores degradê vermelho → ouro
  const cores = labels.map((_, i) => {
    const t = labels.length <= 1 ? 0 : i / (labels.length - 1);
    const r = Math.round(192 + (212 - 192) * t);
    const g = Math.round(57 + (160 - 57) * t);
    const b = Math.round(43 + (23 - 43) * t);
    return `rgba(${r},${g},${b},0.85)`;
  });

  _renderGrafico("chartItensDia", "bar", labels, values, "Qtd pedida");

  if (_chartInstances["chartItensDia"]) {
    _chartInstances["chartItensDia"].data.datasets[0].backgroundColor = cores;
    _chartInstances["chartItensDia"].data.datasets[0].borderColor = cores.map(c => c.replace("0.85", "1"));
    _chartInstances["chartItensDia"].update();
  }

  const lista = document.getElementById("chartItensDiaLista");
  if (lista) {
    lista.innerHTML = sorted.map(([nome, qty], i) => {
      const pct = total > 0 ? Math.round((qty / total) * 100) : 0;
      return `
        <div class="cid-linha">
          <span class="cid-pos">${i + 1}</span>
          <span class="cid-nome">${nome}</span>
          <div class="cid-bar-wrap"><div class="cid-bar" style="width:${pct}%;background:${cores[i]}"></div></div>
          <span class="cid-qty">${qty}x</span>
          <span class="cid-pct">${pct}%</span>
        </div>
      `;
    }).join("");
  }
}

async function excluirVenda(vendaId) {
  const confirmado = await _confirmarAcao("Excluir este registro de venda? Esta ação não pode ser desfeita.");
  if (!confirmado) return;
  try {
    await deleteDoc(doc(db, "vendas", vendaId));
    toast("Registro excluído.", "sucesso");
  } catch (err) {
    console.error("[Mikami] Erro ao excluir venda:", err);
    toast("Erro ao excluir registro.", "erro");
  }
}

function imprimirRelatorio(dataStr, vendas) {
  if (!vendas || !vendas.length) { toast("Nenhuma venda para imprimir.", "info"); return; }

  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const dataFormatada = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const totalDia = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdMesas = vendas.length;
  const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

  const porPag = {};
  vendas.forEach(v => { const met = v.formaPagamento || "Outros"; porPag[met] = (porPag[met] || 0) + (v.total || 0); });

  const pagamentosHtml = Object.entries(porPag).map(([met, val]) => `
    <div class="print-relatorio-resumo-linha"><span>${met}</span><span>${fmtMoeda(val)}</span></div>
  `).join("");

  const vendasHtml = vendas.map(venda => {
    const itensAgrupados = [];
    (venda.itens || []).forEach(item => {
      const ex = itensAgrupados.find(i => i.nome === item.nome);
      if (ex) { ex.qty += item.qty; ex.subtotal += item.preco * item.qty; }
      else itensAgrupados.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty });
    });
    const itensHtml = itensAgrupados.map(item => `
      <div class="print-item"><span>${item.qty}x ${item.nome}</span><span>${fmtMoeda(item.subtotal)}</span></div>
    `).join("");
    return `
      <div class="print-relatorio-venda">
        <div class="print-relatorio-venda-header">
          <span>Mesa ${venda.mesaNumero}</span>
          <span>${fmtDataHora(venda.fechadoEm)}</span>
          <span>${venda.formaPagamento || "—"}</span>
          <span>${fmtMoeda(venda.total || 0)}</span>
        </div>
        ${itensHtml}
      </div>
    `;
  }).join("");

  const printArea = document.getElementById("printArea");
  if (!printArea) { toast("Área de impressão não encontrada.", "erro"); return; }

  printArea.innerHTML = `
    <div class="print-relatorio-titulo">MIKAMI SUSHI</div>
    <div class="print-relatorio-data">Relatório do Dia — ${dataFormatada}</div>
    <div class="print-relatorio-data">Impresso em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="print-relatorio-resumo">
      <div class="print-relatorio-resumo-linha"><span>Total do dia</span><span><strong>${fmtMoeda(totalDia)}</strong></span></div>
      <div class="print-relatorio-resumo-linha"><span>Mesas fechadas</span><span>${qtdMesas}</span></div>
      <div class="print-relatorio-resumo-linha"><span>Ticket médio</span><span>${fmtMoeda(ticketMed)}</span></div>
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0"/>
      ${pagamentosHtml}
    </div>
    <div class="print-section-title">Detalhe por Mesa</div>
    ${vendasHtml}
    <div class="print-footer">Mikami Sushi — Sistema de Gestão</div>
  `;
  window.print();
}

// ── Faturamento histórico ──────────────────────────────────
function initFaturamento() {
  const agora = new Date();
  const inicioAno = new Date(agora.getFullYear() - 1, agora.getMonth() + 1, 1);
  inicioAno.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, "vendas"),
    where("fechadoEm", ">=", Timestamp.fromDate(inicioAno)),
    orderBy("fechadoEm", "asc")
  );

  onSnapshot(q, snap => {
    const vendas = [];
    snap.forEach(d => vendas.push({ id: d.id, ...d.data() }));
    renderFaturamento(vendas);
  });
}

function renderFaturamento(vendas) {
  const agora = new Date();

  // Pré-agrupa vendas por dateString para evitar O(n²)
  const porData = new Map();
  const porMes  = new Map();
  vendas.forEach(v => {
    if (!v.fechadoEm) return;
    const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
    const dataKey = vd.toDateString();
    const mesKey  = `${vd.getFullYear()}-${vd.getMonth()}`;
    porData.set(dataKey, (porData.get(dataKey) || 0) + (v.total || 0));
    porMes.set(mesKey,  (porMes.get(mesKey)  || 0) + (v.total || 0));
  });

  const diasSemana = [], totalSemana = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(agora); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    diasSemana.push(d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }));
    totalSemana.push(parseFloat((porData.get(d.toDateString()) || 0).toFixed(2)));
  }

  const diasMes = [], totalMes = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(agora); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    diasMes.push(d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    totalMes.push(parseFloat((porData.get(d.toDateString()) || 0).toFixed(2)));
  }

  const mesesLabel = [], totalAnual = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    mesesLabel.push(d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }));
    totalAnual.push(parseFloat((porMes.get(`${d.getFullYear()}-${d.getMonth()}`) || 0).toFixed(2)));
  }

  const totalHoje = porData.get(agora.toDateString()) || 0;

  const el = id => document.getElementById(id);
  if (el("fatHoje")) el("fatHoje").textContent = fmtMoeda(totalHoje);
  if (el("fatSemana")) el("fatSemana").textContent = fmtMoeda(totalSemana.reduce((a, b) => a + b, 0));
  if (el("fatMes")) el("fatMes").textContent = fmtMoeda(totalMes.reduce((a, b) => a + b, 0));
  if (el("fatAnual")) el("fatAnual").textContent = fmtMoeda(totalAnual.reduce((a, b) => a + b, 0));

  const porPag = {};
  vendas.forEach(v => { const met = (v.formaPagamento || "Outros").split(" (")[0].trim(); porPag[met] = (porPag[met] || 0) + (v.total || 0); });
  const pagLabels = Object.keys(porPag);
  const pagValues = pagLabels.map(k => parseFloat(porPag[k].toFixed(2)));

  _renderGrafico("chartSemanal", "bar", diasSemana, totalSemana, "Faturamento Diário (7 dias)");
  _renderGrafico("chartMensal", "bar", diasMes, totalMes, "Faturamento Diário (30 dias)");
  _renderGrafico("chartAnual", "bar", mesesLabel, totalAnual, "Faturamento Mensal (12 meses)");
  _renderGrafico("chartPagamento", "doughnut", pagLabels, pagValues, "Por Forma de Pagamento");
}

const _chartInstances = {};
function _renderGrafico(canvasId, tipo, labels, data, titulo) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (_chartInstances[canvasId]) { _chartInstances[canvasId].destroy(); }

  const cores = [
    "rgba(192,57,43,0.85)", "rgba(212,160,23,0.85)", "rgba(39,174,96,0.85)",
    "rgba(41,128,185,0.85)", "rgba(142,68,173,0.85)",
  ];
  const isBarra = tipo === "bar";

  _chartInstances[canvasId] = new Chart(canvas, {
    type: tipo,
    data: {
      labels,
      datasets: [{
        label: titulo,
        data,
        backgroundColor: isBarra ? "rgba(192,57,43,0.75)" : cores,
        borderColor: isBarra ? "rgba(192,57,43,1)" : cores.map(c => c.replace("0.85", "1")),
        borderWidth: isBarra ? 0 : 2,
        borderRadius: isBarra ? 6 : 0,
        hoverBackgroundColor: isBarra ? "rgba(231,76,60,0.9)" : cores,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: tipo === "doughnut",
          labels: { color: "#f0ece6", font: { family: "Inter", size: 12 }, padding: 16 }
        },
        tooltip: {
          callbacks: { label: ctx => ` ${fmtMoeda(ctx.parsed.y ?? ctx.parsed ?? 0)}` },
          backgroundColor: "#1e1e1e", titleColor: "#f0ece6",
          bodyColor: "#d4a017", borderColor: "#363636", borderWidth: 1,
        }
      },
      scales: isBarra ? {
        x: {
          ticks: { color: "#888", font: { size: 11, family: "Inter" }, maxRotation: 45 },
          grid: { color: "rgba(255,255,255,0.04)" }
        },
        y: {
          ticks: { color: "#888", font: { size: 11, family: "Inter" }, callback: v => "R$\u00a0" + v.toLocaleString("pt-BR") },
          grid: { color: "rgba(255,255,255,0.06)" }
        }
      } : {}
    }
  });
}

// ============================================================
// 7. INIT — Detecta página e inicializa
// ============================================================
const pagina = document.body.className;

if (pagina.includes("page-mesas")) initIndex();
else if (pagina.includes("page-mesa")) initMesa();
else if (pagina.includes("page-cozinha")) initCozinha();
else if (pagina.includes("page-relatorio")) initRelatorio();  // FIX: estava faltando