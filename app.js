// ============================================================
// app.js — Lógica completa do sistema Mikami Sushi
// ============================================================
// Organização por blocos:
//   1. CARDÁPIO (seed de produtos)
//   2. UTILITÁRIOS
//   3. PÁGINA: INDEX (mesas)
//   4. PÁGINA: MESA (pedidos)
//   5. PÁGINA: COZINHA
//   6. PÁGINA: RELATÓRIO
//   7. INIT (detecta página e inicializa)
// ============================================================

import {
  db,
  collection, doc,
  getDoc, getDocs, setDoc, addDoc, updateDoc,
  onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp, increment
} from "./firebase.js";

// ============================================================
// 1. CARDÁPIO — PRODUTOS PRÉ-CARREGADOS
// ============================================================
const CARDAPIO = [
  // COMBOS
  { nome: "Combo Temaki Salmão + 10 Hot Roll",                              categoria: "Combos",      preco: 37.00, ativo: true },
  { nome: "Combo Mini Dog + 3 Croquetes + 3 Uramaki",                      categoria: "Combos",      preco: 32.00, ativo: true },
  { nome: "Combo 10 Hot Skin + 10 Uramaki + 10 Hosomaki Kani",             categoria: "Combos",      preco: 43.00, ativo: true },
  { nome: "Combo 20 Hot Roll Sortidas",                                     categoria: "Combos",      preco: 32.00, ativo: true },
  { nome: "Combo 2 Joe + 2 Niguiri + 5 Uramaki + 5 Hosomaki + 6 Hot Roll", categoria: "Combos",      preco: 46.00, ativo: true },

  // INDIVIDUAIS
  { nome: "Uramaki de Salmão",         categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll de Salmão",        categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll de Kani",          categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hot Roll Skin",             categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Hosomaki de Salmão",        categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Rolinho Primavera (4 un.)", categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Croquete de Salmão (6 un.)",categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Kani Queijo (6 un.)",       categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Hot Dog Salmão",            categoria: "Individuais", preco: 30.00, ativo: true },
  { nome: "Hot Dog Salmão e Camarão",  categoria: "Individuais", preco: 35.00, ativo: true },
  { nome: "Sunomono",                  categoria: "Individuais", preco: 10.00, ativo: true },
  { nome: "Poke",                  categoria: "Individuais", preco: 37.00, ativo: true },
  

  // ESPECIAIS
  { nome: "Uramaki Kani com Camarão",                          categoria: "Especiais", preco: 27.00, ativo: true },
  { nome: "Uramaki Salmão Geleia",                             categoria: "Especiais", preco: 27.00, ativo: true },
  { nome: "Hot Especial",                                      categoria: "Especiais", preco: 22.00, ativo: true },
  { nome: "Nathos de Salmão e Geleia (4 un.)",                 categoria: "Especiais", preco: 15.00, ativo: true },
  { nome: "Joe (3 un.)",                                       categoria: "Especiais", preco: 18.00, ativo: true },
  { nome: "Niguiri (3 un.)",                                   categoria: "Especiais", preco: 15.00, ativo: true },
  { nome: "Mikami Supremo 500g",                               categoria: "Especiais", preco: 55.00, ativo: true },

  // TEMAKIS
  { nome: "Temaki Copo Salmão", categoria: "Temakis", preco: 28.00, ativo: true },
  { nome: "Temaki de Salmão",   categoria: "Temakis", preco: 25.00, ativo: true },
  { nome: "Temaki de Kani",     categoria: "Temakis", preco: 22.00, ativo: true },
  { nome: "Temaki de Skin",     categoria: "Temakis", preco: 21.00, ativo: true },
  { nome: "Temaki de Camarão",  categoria: "Temakis", preco: 30.00, ativo: true },

  // YAKISOBA
  { nome: "Yakisoba Individual",  categoria: "Yakisoba", preco: 20.00, ativo: true },
  { nome: "Yakisoba 2 Pessoas",   categoria: "Yakisoba", preco: 30.00, ativo: true },

  // DOCES
  { nome: "Harumaki Banana com Nutella",                           categoria: "Doces", preco: 20.00, ativo: true },
  { nome: "Harumaki Nutella + Doce de Leite + Romeu e Julieta",   categoria: "Doces", preco: 22.00, ativo: true },

  // BEBIDAS
  { nome: "Coca Zero Lata 220ml",    categoria: "Bebidas", preco: 4.50, ativo: true },
  { nome: "Coca Lata 350ml",         categoria: "Bebidas", preco: 6.00, ativo: true },
  { nome: "Fanta Lata 220ml",        categoria: "Bebidas", preco: 6.00, ativo: true },
  { nome: "H2O ",         categoria: "Bebidas", preco: 7.0, ativo: true },
  { nome: "Guaraná Antartica Lata 350ml",         categoria: "Bebidas", preco: 5.50, ativo: true },
  { nome: "Coca Mini Pet 250ml",     categoria: "Bebidas", preco: 5.00, ativo: true },
  { nome: "Coca Zero Mini Pet 250ml",categoria: "Bebidas", preco: 5.00, ativo: true },
  { nome: "Água",                    categoria: "Bebidas", preco: 3.00, ativo: true },
  { nome: "Água com Gás",            categoria: "Bebidas", preco: 4.00, ativo: true },
  { nome: "Suco Copo",         categoria: "Bebidas", preco: 8.0, ativo: true },
  { nome: "Suco Jarra",         categoria: "Bebidas", preco: 15.0, ativo: true },
];

const TOTAL_MESAS = 14;

// ============================================================
// 2. UTILITÁRIOS
// ============================================================

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
  if (diff < 60)   return `${diff}s`;
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
  setTimeout(() => el.remove(), 3200);
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

// ── SEED: garante produtos no Firestore (1 leitura só) ───────
async function garantirProdutos() {
  try {
    const snap = await getDocs(collection(db, "produtos"));
    if (snap.size >= CARDAPIO.length) return;

    const existentes = new Set(snap.docs.map(d => d.id));
    const promises = CARDAPIO.map((p, i) => {
      const id = `prod_${i.toString().padStart(3, "0")}`;
      if (existentes.has(id)) return Promise.resolve();
      return setDoc(doc(db, "produtos", id), p);
    });
    await Promise.all(promises);
    console.log("[Mikami] Cardápio carregado no Firestore.");
  } catch (err) {
    console.error("[Mikami] Erro ao garantir produtos:", err);
  }
}

// ── SEED: garante mesas no Firestore (1 leitura só) ──────────
async function garantirMesas() {
  try {
    const snap = await getDocs(collection(db, "mesas"));
    const existentes = new Set(snap.docs.map(d => d.id));

    const promises = [];
    for (let i = 1; i <= TOTAL_MESAS; i++) {
      const id = `mesa_${i}`;
      if (!existentes.has(id)) {
        promises.push(setDoc(doc(db, "mesas", id), {
          numero: i,
          status: "livre",
          abertaEm: null,
          total: 0,
          pedidosCount: 0,
          historicoPedidos: []
        }));
      }
    }
    if (promises.length) await Promise.all(promises);
  } catch (err) {
    console.error("[Mikami] Erro ao garantir mesas:", err);
  }
}

// ============================================================
// 3. PÁGINA: INDEX — MESAS
// ============================================================
async function initIndex() {
  iniciarRelogio();
  await garantirProdutos();
  await garantirMesas();

  // Escuta mesas em tempo real
  onSnapshot(collection(db, "mesas"), snap => {
    const mesas = [];
    snap.forEach(d => mesas.push({ id: d.id, ...d.data() }));
    mesas.sort((a, b) => a.numero - b.numero);
    renderMesas(mesas);
    renderStats(mesas);
  });

  escutarFaturamentoDia();
}

function renderMesas(mesas) {
  const grid = document.getElementById("mesasGrid");
  grid.innerHTML = "";

  const statusLabel = { livre: "Livre", ocupada: "Ocupada", aguardando: "Aguardando Pagto." };

  mesas.forEach(mesa => {
    const card = document.createElement("div");
    card.className = `mesa-card ${mesa.status}`;
    card.innerHTML = `
      <div class="mesa-card-header">
        <div class="mesa-numero">${mesa.numero}</div>
        <div class="mesa-status-pill status-${mesa.status}">
          ${statusLabel[mesa.status] || mesa.status}
        </div>
      </div>
      <div class="mesa-card-info">
        <div class="mesa-total">${mesa.status !== "livre" ? fmtMoeda(mesa.total || 0) : "—"}</div>
        <div class="mesa-meta">
          ${mesa.abertaEm
            ? `<span>Aberta: ${fmtHora(mesa.abertaEm)}</span>`
            : "<span>Mesa livre</span>"}
          ${mesa.pedidosCount ? `<span>${mesa.pedidosCount} pedido(s)</span>` : ""}
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      window.location.href = `mesa.html?mesa=${mesa.numero}`;
    });
    grid.appendChild(card);
  });
}

function renderStats(mesas) {
  document.getElementById("statLivres").textContent     = mesas.filter(m => m.status === "livre").length;
  document.getElementById("statOcupadas").textContent   = mesas.filter(m => m.status === "ocupada").length;
  document.getElementById("statAguardando").textContent = mesas.filter(m => m.status === "aguardando").length;
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
const estadoMesa = {
  numero: null,
  mesaId: null,
  dadosMesa: null,
  pedidoAtual: [],
  produtos: [],
  categoriaAtiva: "Todos",
  buscaTermo: ""
};

async function initMesa() {
  iniciarRelogio();

  const params = new URLSearchParams(window.location.search);
  estadoMesa.numero = parseInt(params.get("mesa")) || 1;
  estadoMesa.mesaId = `mesa_${estadoMesa.numero}`;

  document.getElementById("mesaNumeroBadge").textContent = `Mesa ${estadoMesa.numero}`;
  document.title = `Mesa ${estadoMesa.numero} — Mikami Sushi`;

  // Carrega produtos
  try {
    const snapProd = await getDocs(collection(db, "produtos"));
    snapProd.forEach(d => estadoMesa.produtos.push({ id: d.id, ...d.data() }));
    estadoMesa.produtos.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (err) {
    toast("Erro ao carregar cardápio.", "erro");
    console.error(err);
  }

  renderCategorias();
  renderProdutos();

  // Escuta a mesa em tempo real
  onSnapshot(doc(db, "mesas", estadoMesa.mesaId), snap => {
    if (!snap.exists()) return;
    estadoMesa.dadosMesa = snap.data();
    atualizarHeaderMesa();
    renderConta();
  });

  // Eventos
  document.getElementById("buscaProduto").addEventListener("input", e => {
    estadoMesa.buscaTermo = e.target.value.toLowerCase();
    renderProdutos();
  });

  document.getElementById("btnConfirmarPedido").addEventListener("click", confirmarPedido);
  document.getElementById("btnImprimirCozinha").addEventListener("click", imprimirCozinha);
  document.getElementById("btnImprimirConta").addEventListener("click", imprimirConta);
  document.getElementById("btnFecharMesa").addEventListener("click", abrirModalFechar);
  document.getElementById("btnCancelarFechar").addEventListener("click", fecharModal);
  document.getElementById("btnConfirmarFechar").addEventListener("click", fecharMesa);

  document.querySelectorAll(".pagamento-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pagamento-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("btnConfirmarFechar").disabled = false;
    });
  });
}

// ── Cardápio ──────────────────────────────────────────────
function renderCategorias() {
  const cats = ["Todos", ...new Set(estadoMesa.produtos.map(p => p.categoria))];
  const container = document.getElementById("categoriasTabs");
  container.innerHTML = cats.map(c => `
    <button class="cat-btn ${c === estadoMesa.categoriaAtiva ? "active" : ""}"
            data-cat="${c}">${c}</button>
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

  if (estadoMesa.categoriaAtiva !== "Todos") {
    lista = lista.filter(p => p.categoria === estadoMesa.categoriaAtiva);
  }

  if (estadoMesa.buscaTermo) {
    lista = lista.filter(p => p.nome.toLowerCase().includes(estadoMesa.buscaTermo));
  }

  const container = document.getElementById("produtosLista");

  if (!lista.length) {
    container.innerHTML = `<div class="pedido-vazio"><p>Nenhum produto encontrado.</p></div>`;
    return;
  }

  container.innerHTML = lista.map(p => `
    <div class="produto-card" data-id="${p.id}">
      <div class="produto-info">
        <span class="produto-nome">${p.nome}</span>
        <span class="produto-cat-tag">${p.categoria}</span>
      </div>
      <span class="produto-preco">${fmtMoeda(p.preco)}</span>
      <button class="produto-add-btn" data-id="${p.id}" title="Adicionar ao pedido">+</button>
    </div>
  `).join("");

  container.querySelectorAll(".produto-add-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      adicionarAoPedido(btn.dataset.id);
    });
  });

  container.querySelectorAll(".produto-card").forEach(card => {
    card.addEventListener("click", () => {
      adicionarAoPedido(card.dataset.id);
    });
  });
}

// ── Pedido atual ──────────────────────────────────────────
function adicionarAoPedido(prodId) {
  const prod = estadoMesa.produtos.find(p => p.id === prodId);
  if (!prod) return;

  const existente = estadoMesa.pedidoAtual.find(i => i.prodId === prodId);
  if (existente) {
    existente.qty++;
  } else {
    estadoMesa.pedidoAtual.push({
      prodId,
      nome: prod.nome,
      preco: prod.preco,
      qty: 1,
      obs: ""
    });
  }

  renderPedidoAtual();
  toast(`${prod.nome} adicionado`, "sucesso");
}

function renderPedidoAtual() {
  const container = document.getElementById("pedidoItens");
  const itens = estadoMesa.pedidoAtual;

  const totalPedido = itens.reduce((acc, i) => acc + i.preco * i.qty, 0);

  document.getElementById("pedidoCount").textContent           = `${itens.length} item(ns)`;
  document.getElementById("pedidoTotal").textContent           = fmtMoeda(totalPedido);
  document.getElementById("btnConfirmarPedido").disabled       = itens.length === 0;

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
        <span class="pedido-item-nome">${item.nome}</span>
        <span class="pedido-item-subtotal">${fmtMoeda(item.preco * item.qty)}</span>
        <button class="remove-item-btn" data-idx="${idx}" title="Remover item">✕</button>
      </div>
      <div class="pedido-item-controls">
        <button class="qty-btn" data-idx="${idx}" data-acao="dec">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-idx="${idx}" data-acao="inc">+</button>
        <span style="font-size:0.68rem;color:var(--cinza-texto);margin-left:0.3rem">
          ${fmtMoeda(item.preco)} un.
        </span>
      </div>
      <textarea
        class="obs-input"
        placeholder="Observação (ex: sem cream cheese)"
        data-idx="${idx}"
      >${item.obs}</textarea>
    </div>
  `).join("");

  container.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.acao === "inc") {
        estadoMesa.pedidoAtual[idx].qty++;
      } else {
        estadoMesa.pedidoAtual[idx].qty--;
        if (estadoMesa.pedidoAtual[idx].qty <= 0) {
          estadoMesa.pedidoAtual.splice(idx, 1);
        }
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
      if (estadoMesa.pedidoAtual[idx]) {
        estadoMesa.pedidoAtual[idx].obs = input.value;
      }
    });
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

    // Salva pedido na coleção "pedidos"
    const pedidoData = {
      mesaNumero: estadoMesa.numero,
      mesaId:     estadoMesa.mesaId,
      itens: itens.map(i => ({
        prodId: i.prodId,
        nome:   i.nome,
        preco:  i.preco,
        qty:    i.qty,
        obs:    i.obs || ""
      })),
      total:     totalPedido,
      status:    "Novo",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const pedidoRef = await addDoc(collection(db, "pedidos"), pedidoData);

    // Atualiza a mesa usando increment (sem race condition)
    const mesaRef = doc(db, "mesas", estadoMesa.mesaId);
    const mesaSnap = await getDoc(mesaRef);
    const mesaData = mesaSnap.data();

    const novoHistorico = [...(mesaData.historicoPedidos || []), {
      pedidoId: pedidoRef.id,
      itens:    pedidoData.itens,
      total:    totalPedido,
      status:   "Novo",
      criadoEm: new Date().toISOString()
    }];

    await updateDoc(mesaRef, {
      status:            "ocupada",
      abertaEm:          mesaData.abertaEm || serverTimestamp(),
      total:             increment(totalPedido),   // FIX: sem race condition
      pedidosCount:      increment(1),             // FIX: sem race condition
      historicoPedidos:  novoHistorico
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

// ── Conta da mesa ─────────────────────────────────────────
function atualizarHeaderMesa() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa) return;

  const statusMap = { livre: "Livre", ocupada: "Ocupada", aguardando: "Aguardando Pagto." };
  const badge = document.getElementById("mesaStatusBadge");
  badge.textContent = statusMap[mesa.status] || mesa.status;
  badge.className   = `mesa-status-badge ${mesa.status}`;

  document.getElementById("mesaAbertura").textContent =
    mesa.abertaEm ? `Aberta às ${fmtHora(mesa.abertaEm)}` : "Mesa livre";

  const total = mesa.total || 0;
  document.getElementById("contaTotalBadge").textContent = fmtMoeda(total);
  document.getElementById("contaTotalFinal").textContent = fmtMoeda(total);
  document.getElementById("modalTotalCobrar").textContent = fmtMoeda(total);
}

function renderConta() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa) return;

  const container = document.getElementById("contaHistorico");
  const historico  = mesa.historicoPedidos || [];

  if (!historico.length) {
    container.innerHTML = `<div class="conta-vazia"><span>Nenhum pedido confirmado ainda.</span></div>`;
    return;
  }

  const badgeClass = {
    "Novo":       "badge-novo",
    "Em preparo": "badge-preparo",
    "Pronto":     "badge-pronto",
    "Entregue":   "badge-entregue"
  };

  container.innerHTML = historico.map((pedido, idx) => {
    const itemsHtml = (pedido.itens || []).map(item => `
      <div class="conta-item-linha">
        <span class="conta-item-nome">${item.nome}</span>
        <span class="conta-item-qty">${item.qty}x</span>
        <span class="conta-item-val">${fmtMoeda(item.preco * item.qty)}</span>
      </div>
      ${item.obs ? `<div class="conta-item-obs">↳ ${item.obs}</div>` : ""}
    `).join("");

    const hora = pedido.criadoEm
      ? new Date(pedido.criadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "";

    return `
      <div class="conta-pedido-grupo">
        <div class="conta-pedido-header">
          <span class="conta-pedido-seq">Pedido #${idx + 1}</span>
          <span class="status-badge ${badgeClass[pedido.status] || "badge-novo"}">
            ${pedido.status || "Novo"}
          </span>
          <span class="conta-pedido-hora">${hora}</span>
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

  // Rola para o final automaticamente ao adicionar pedido novo
  container.scrollTop = container.scrollHeight;
}

// ── Impressão ─────────────────────────────────────────────

// FIX: imprime todos os pedidos não-entregues, não só o último
function imprimirCozinha() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || !mesa.historicoPedidos?.length) {
    toast("Nenhum pedido para imprimir.", "erro");
    return;
  }

  // Pega todos os pedidos com status Novo ou Em preparo
  const pedidosParaImprimir = mesa.historicoPedidos.filter(
    p => p.status === "Novo" || p.status === "Em preparo"
  );

  // Se não houver pedidos nesse estado, usa o último
  const alvo = pedidosParaImprimir.length > 0
    ? pedidosParaImprimir
    : [mesa.historicoPedidos[mesa.historicoPedidos.length - 1]];

  const pedidosHtml = alvo.map((pedido, idx) => {
    const itensHtml = (pedido.itens || []).map(item => `
      <div class="print-item">
        <span>${item.qty}x ${item.nome}</span>
      </div>
      ${item.obs ? `<div class="print-item-obs">→ ${item.obs}</div>` : ""}
    `).join("");
    return `
      <div class="print-section-title">PEDIDO ${idx + 1}</div>
      ${itensHtml}
    `;
  }).join("");

  document.getElementById("printArea").innerHTML = `
    <div class="print-header">
      <h2>MIKAMI SUSHI</h2>
      <p>— PEDIDO COZINHA —</p>
      <p>Mesa: <strong>${estadoMesa.numero}</strong></p>
      <p>${new Date().toLocaleString("pt-BR")}</p>
    </div>
    ${pedidosHtml}
    <div class="print-footer">Impresso em ${new Date().toLocaleTimeString("pt-BR")}</div>
  `;

  window.print();
}

function imprimirConta() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || !mesa.historicoPedidos?.length) {
    toast("Nenhum item na conta.", "erro");
    return;
  }

  const todosItens = [];
  (mesa.historicoPedidos || []).forEach(pedido => {
    (pedido.itens || []).forEach(item => {
      const exist = todosItens.find(i => i.nome === item.nome && !item.obs && !i.obs);
      if (exist) {
        exist.qty     += item.qty;
        exist.subtotal += item.preco * item.qty;
      } else {
        todosItens.push({
          nome:     item.nome,
          qty:      item.qty,
          preco:    item.preco,
          subtotal: item.preco * item.qty,
          obs:      item.obs
        });
      }
    });
  });

  const itensHtml = todosItens.map(item => `
    <div class="print-item">
      <span>${item.qty}x ${item.nome}</span>
      <span>${fmtMoeda(item.subtotal)}</span>
    </div>
    ${item.obs ? `<div class="print-item-obs">→ ${item.obs}</div>` : ""}
  `).join("");

  document.getElementById("printArea").innerHTML = `
    <div class="print-header">
      <h2>MIKAMI SUSHI</h2>
      <p>— PRÉ-CONTA —</p>
      <p>Mesa: <strong>${estadoMesa.numero}</strong></p>
      <p>${new Date().toLocaleString("pt-BR")}</p>
    </div>
    <div class="print-section-title">ITENS CONSUMIDOS</div>
    ${itensHtml}
    <div class="print-total">
      <span>TOTAL</span>
      <span>${fmtMoeda(mesa.total || 0)}</span>
    </div>
    <div class="print-footer">
      Obrigado pela visita!<br>Mikami Sushi
    </div>
  `;

  window.print();
}

// ── Fechar mesa ───────────────────────────────────────────
function abrirModalFechar() {
  const mesa = estadoMesa.dadosMesa;
  if (!mesa || mesa.status === "livre") {
    toast("Mesa já está livre.", "info");
    return;
  }
  if ((mesa.total || 0) <= 0) {
    toast("Conta zerada. Nada a fechar.", "info");
    return;
  }
  document.getElementById("modalFecharMesa").classList.add("open");
}

function fecharModal() {
  document.getElementById("modalFecharMesa").classList.remove("open");
  document.querySelectorAll(".pagamento-btn").forEach(b => b.classList.remove("selected"));
  document.getElementById("btnConfirmarFechar").disabled = true;
}

async function fecharMesa() {
  const metodoBtn = document.querySelector(".pagamento-btn.selected");
  if (!metodoBtn) return;

  const btnFechar = document.getElementById("btnConfirmarFechar");
  btnFechar.disabled   = true;
  btnFechar.textContent = "Fechando...";

  try {
    const metodo = metodoBtn.dataset.metodo;
    const mesa   = estadoMesa.dadosMesa;

    // Salva venda no histórico
    await addDoc(collection(db, "vendas"), {
      mesaNumero:     estadoMesa.numero,
      mesaId:         estadoMesa.mesaId,
      itens:          mesa.historicoPedidos?.flatMap(p => p.itens) || [],
      total:          mesa.total || 0,
      formaPagamento: metodo,
      fechadoEm:      serverTimestamp()
    });

    // Marca pedidos da mesa como Entregue no Firestore
    const pedidosSnap = await getDocs(
      query(collection(db, "pedidos"), where("mesaId", "==", estadoMesa.mesaId))
    );
    const marcacoes = pedidosSnap.docs.map(d =>
      updateDoc(d.ref, { status: "Entregue", updatedAt: serverTimestamp() })
    );
    await Promise.all(marcacoes);

    // Reseta a mesa
    await updateDoc(doc(db, "mesas", estadoMesa.mesaId), {
      status:           "livre",
      abertaEm:         null,
      total:            0,
      pedidosCount:     0,
      historicoPedidos: []
    });

    fecharModal();
    toast("Mesa fechada com sucesso!", "sucesso");
    setTimeout(() => window.location.href = "index.html", 1500);
  } catch (err) {
    console.error("[Mikami] Erro ao fechar mesa:", err);
    toast("Erro ao fechar mesa. Tente novamente.", "erro");
    btnFechar.disabled   = false;
    btnFechar.textContent = "Confirmar Fechamento";
  }
}

// ============================================================
// 5. PÁGINA: COZINHA
// ============================================================
let filtroAtivo    = "todos";
let pedidosCached  = [];  // FIX: cache local para re-renderizar no filtro

function initCozinha() {
  iniciarRelogio();

  // FIX: filtro re-renderiza com dados em cache, sem precisar de novo snapshot
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      filtroAtivo = btn.dataset.filtro;
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderCozinha(pedidosCached);  // usa cache
    });
  });

  const q = query(
    collection(db, "pedidos"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {
    pedidosCached = [];
    snap.forEach(d => pedidosCached.push({ id: d.id, ...d.data() }));
    renderCozinha(pedidosCached);

    const ativos = pedidosCached.filter(p => p.status !== "Entregue");
    const el = document.getElementById("pedidosAtivosCount");
    if (el) el.textContent = `${ativos.length} pedido(s) ativo(s)`;
  });

  // Atualiza tempos a cada 30s
  setInterval(() => {
    document.querySelectorAll(".pedido-card-tempo[data-ts]").forEach(el => {
      const ts = parseInt(el.dataset.ts);
      if (ts) el.textContent = fmtTempo({ toDate: () => new Date(ts) });
    });
  }, 30000);
}

function renderCozinha(pedidos) {
  const grid = document.getElementById("pedidosGrid");

  let filtrados = pedidos;
  if (filtroAtivo !== "todos") {
    filtrados = pedidos.filter(p => p.status === filtroAtivo);
  }

  if (!filtrados.length) {
    grid.innerHTML = `
      <div class="loading-mesas" style="grid-column:1/-1">
        <span style="font-size:2rem">🍣</span>
        <p>${filtroAtivo === "todos" ? "Nenhum pedido ativo." : `Nenhum pedido com status "${filtroAtivo}".`}</p>
      </div>`;
    return;
  }

  const statusClass = {
    "Novo":       "status-novo",
    "Em preparo": "status-preparo",
    "Pronto":     "status-pronto",
    "Entregue":   "status-entregue"
  };

  const badgeClass = {
    "Novo":       "badge-novo",
    "Em preparo": "badge-preparo",
    "Pronto":     "badge-pronto",
    "Entregue":   "badge-entregue"
  };

  grid.innerHTML = filtrados.map(pedido => {
    const tsMs = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : null;

    const itensHtml = (pedido.itens || []).map(item => `
      <div class="pedido-card-item">
        <span class="pedido-card-item-qty">${item.qty}x</span>
        <span class="pedido-card-item-nome">${item.nome}</span>
        ${item.obs ? `<span class="pedido-card-item-obs">→ ${item.obs}</span>` : ""}
      </div>
    `).join("");

    let botoesHtml = "";
    if (pedido.status === "Novo") {
      botoesHtml = `<button class="btn-secondary" data-id="${pedido.id}" data-status="Em preparo">▶ Em preparo</button>`;
    } else if (pedido.status === "Em preparo") {
      botoesHtml = `<button class="btn-primary"   data-id="${pedido.id}" data-status="Pronto">✓ Marcar Pronto</button>`;
    } else if (pedido.status === "Pronto") {
      botoesHtml = `<button class="btn-secondary" data-id="${pedido.id}" data-status="Entregue">✓ Marcar Entregue</button>`;
    }

    return `
      <div class="pedido-card ${statusClass[pedido.status] || "status-novo"}" data-pedido-id="${pedido.id}">
        <div class="pedido-card-header">
          <div>
            <div class="pedido-card-mesa">Mesa ${pedido.mesaNumero}</div>
            <div><span class="status-badge ${badgeClass[pedido.status] || "badge-novo"}">${pedido.status || "Novo"}</span></div>
          </div>
          <div class="pedido-card-meta">
            <span class="pedido-card-hora">${pedido.createdAt ? fmtHora(pedido.createdAt) : "—"}</span>
            <span class="pedido-card-tempo" data-ts="${tsMs || ""}">
              ${tsMs ? fmtTempo({ toDate: () => new Date(tsMs) }) : ""}
            </span>
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
    btn.addEventListener("click", () =>
      atualizarStatusPedido(btn.dataset.id, btn.dataset.status)
    );
  });

  grid.querySelectorAll(".btn-excluir-pedido").forEach(btn => {
    btn.addEventListener("click", () =>
      excluirPedido(btn.dataset.excluirId, btn.dataset.mesaId, parseFloat(btn.dataset.total))
    );
  });
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
  try {
    // Atualiza na coleção "pedidos"
    await updateDoc(doc(db, "pedidos", pedidoId), {
      status:    novoStatus,
      updatedAt: serverTimestamp()
    });

    // FIX: sincroniza status no historicoPedidos da mesa também
    const pedidoSnap = await getDoc(doc(db, "pedidos", pedidoId));
    if (!pedidoSnap.exists()) return;
    const pedidoData = pedidoSnap.data();

    const mesaRef  = doc(db, "mesas", pedidoData.mesaId);
    const mesaSnap = await getDoc(mesaRef);
    if (!mesaSnap.exists()) return;

    const mesaData = mesaSnap.data();
    const historico = (mesaData.historicoPedidos || []).map(p =>
      p.pedidoId === pedidoId ? { ...p, status: novoStatus } : p
    );

    await updateDoc(mesaRef, { historicoPedidos: historico });
    toast(`Pedido marcado como: ${novoStatus}`, "sucesso");
  } catch (err) {
    console.error("[Mikami] Erro ao atualizar pedido:", err);
    toast("Erro ao atualizar pedido.", "erro");
  }
}

async function excluirPedido(pedidoId, mesaId, totalPedido) {
  if (!confirm("Excluir este pedido? Esta ação não pode ser desfeita.")) return;

  try {
    // Remove da coleção pedidos
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await deleteDoc(doc(db, "pedidos", pedidoId));

    // Remove do historicoPedidos da mesa e desconta o total
    if (mesaId) {
      const mesaRef  = doc(db, "mesas", mesaId);
      const mesaSnap = await getDoc(mesaRef);
      if (mesaSnap.exists()) {
        const mesaData   = mesaSnap.data();
        const historico  = (mesaData.historicoPedidos || []).filter(p => p.pedidoId !== pedidoId);
        const novoTotal  = Math.max(0, (mesaData.total || 0) - totalPedido);
        const novoStatus = historico.length === 0 ? "livre" : mesaData.status;
        await updateDoc(mesaRef, {
          historicoPedidos: historico,
          total:            novoTotal,
          pedidosCount:     Math.max(0, (mesaData.pedidosCount || 1) - 1),
          status:           novoStatus,
          abertaEm:         novoStatus === "livre" ? null : mesaData.abertaEm
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
let unsubRelatorio = null;  // para limpar listener anterior
let vendasAtuais   = [];      // cache para impressão do relatório

function initRelatorio() {
  iniciarRelogio();

  const hoje     = new Date().toISOString().split("T")[0];
  const inputData = document.getElementById("filtroData");
  inputData.value = hoje;

  // FIX: usa onSnapshot para atualização em tempo real
  inputData.addEventListener("change", () => escutarVendas(inputData.value));
  document.getElementById("btnHoje").addEventListener("click", () => {
    inputData.value = hoje;
    escutarVendas(hoje);
  });

  // Botão imprimir relatório
  const btnImprimir = document.getElementById("btnImprimirRelatorio");
  if (btnImprimir) {
    btnImprimir.addEventListener("click", () => {
      imprimirRelatorio(inputData.value, vendasAtuais);
    });
  }

  escutarVendas(hoje);
}

function escutarVendas(dataStr) {
  // Cancela listener anterior se existir
  if (unsubRelatorio) {
    unsubRelatorio();
    unsubRelatorio = null;
  }

  // Ajusta as datas corretamente para o fuso local
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const inicio = new Date(ano, mes - 1, dia, 0, 0, 0);
  const fim    = new Date(ano, mes - 1, dia, 23, 59, 59);

  const q = query(
    collection(db, "vendas"),
    where("fechadoEm", ">=",  Timestamp.fromDate(inicio)),
    where("fechadoEm", "<=",  Timestamp.fromDate(fim)),
    orderBy("fechadoEm", "desc")
  );

  // Mostra loading
  const container = document.getElementById("vendasLista");
  container.innerHTML = `
    <div class="loading-mesas">
      <div class="loading-spinner"></div>
      <p>Carregando...</p>
    </div>`;

  // FIX: onSnapshot em vez de getDocs — relatório reativo
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
  const totalDia  = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdMesas  = vendas.length;
  const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

  document.getElementById("resumoTotal").textContent  = fmtMoeda(totalDia);
  document.getElementById("resumoMesas").textContent  = qtdMesas;
  document.getElementById("resumoTicket").textContent = fmtMoeda(ticketMed);

  // Breakdown por pagamento
  const porPag = {};
  vendas.forEach(v => {
    const met = v.formaPagamento || "Outros";
    porPag[met] = (porPag[met] || 0) + (v.total || 0);
  });

  const breakdown = document.getElementById("pagamentosBreakdown");
  if (Object.keys(porPag).length === 0) {
    breakdown.innerHTML = `<span class="resumo-label">Nenhum pagamento</span>`;
  } else {
    breakdown.innerHTML = Object.entries(porPag).map(([met, val]) => `
      <div class="pag-linha">
        <span class="pag-metodo">${met}</span>
        <span class="pag-valor">${fmtMoeda(val)}</span>
      </div>
    `).join("");
  }

  // Lista de vendas
  const container = document.getElementById("vendasLista");

  if (!vendas.length) {
    container.innerHTML = `
      <div class="loading-mesas">
        <span style="font-size:2rem">📋</span>
        <p>Nenhuma venda registrada nessa data.</p>
      </div>`;
    return;
  }

  container.innerHTML = vendas.map(venda => {
    const itensAgrupados = [];
    (venda.itens || []).forEach(item => {
      const ex = itensAgrupados.find(i => i.nome === item.nome);
      if (ex) {
        ex.qty      += item.qty;
        ex.subtotal += item.preco * item.qty;
      } else {
        itensAgrupados.push({
          nome:     item.nome,
          qty:      item.qty,
          preco:    item.preco,
          subtotal: item.preco * item.qty
        });
      }
    });

    const itensHtml = itensAgrupados.map(item => `
      <div class="venda-item-linha">
        <span class="venda-item-nome">${item.nome}</span>
        <span class="venda-item-qty">${item.qty}x</span>
        <span class="venda-item-val">${fmtMoeda(item.subtotal)}</span>
      </div>
    `).join("");

    return `
      <div class="venda-card">
        <div class="venda-card-header">
          <span class="venda-mesa">Mesa ${venda.mesaNumero}</span>
          <span class="venda-hora">${fmtDataHora(venda.fechadoEm)}</span>
          <span class="venda-pagamento">${venda.formaPagamento || "—"}</span>
          <span class="venda-total-valor">${fmtMoeda(venda.total || 0)}</span>
          <button class="btn-excluir-venda" data-venda-id="${venda.id}" title="Excluir registro">🗑 Excluir</button>
        </div>
        <div class="venda-itens-lista">${itensHtml}</div>
      </div>
    `;
  }).join("");

  // Eventos de exclusão de venda
  document.querySelectorAll(".btn-excluir-venda").forEach(btn => {
    btn.addEventListener("click", () => excluirVenda(btn.dataset.vendaId));
  });
}

// ── Excluir Venda ─────────────────────────────────────────────
async function excluirVenda(vendaId) {
  if (!confirm("Excluir este registro de venda? Esta ação não pode ser desfeita.")) return;

  try {
    const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await deleteDoc(doc(db, "vendas", vendaId));
    toast("Registro excluído.", "sucesso");
    // O onSnapshot do relatório atualiza automaticamente
  } catch (err) {
    console.error("[Mikami] Erro ao excluir venda:", err);
    toast("Erro ao excluir registro.", "erro");
  }
}

// ── Imprimir Relatório ────────────────────────────────────────
function imprimirRelatorio(dataStr, vendas) {
  if (!vendas || !vendas.length) {
    toast("Nenhuma venda para imprimir.", "info");
    return;
  }

  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const dataFormatada = new Date(ano, mes - 1, dia)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const totalDia  = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdMesas  = vendas.length;
  const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

  // Breakdown por pagamento
  const porPag = {};
  vendas.forEach(v => {
    const met = v.formaPagamento || "Outros";
    porPag[met] = (porPag[met] || 0) + (v.total || 0);
  });

  const pagamentosHtml = Object.entries(porPag).map(([met, val]) => `
    <div class="print-relatorio-resumo-linha">
      <span>${met}</span>
      <span>${fmtMoeda(val)}</span>
    </div>
  `).join("");

  const vendasHtml = vendas.map((venda, idx) => {
    const itensAgrupados = [];
    (venda.itens || []).forEach(item => {
      const ex = itensAgrupados.find(i => i.nome === item.nome);
      if (ex) { ex.qty += item.qty; ex.subtotal += item.preco * item.qty; }
      else itensAgrupados.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty });
    });

    const itensHtml = itensAgrupados.map(item => `
      <div class="print-item">
        <span>${item.qty}x ${item.nome}</span>
        <span>${fmtMoeda(item.subtotal)}</span>
      </div>
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
  if (!printArea) {
    toast("Área de impressão não encontrada.", "erro");
    return;
  }

  printArea.innerHTML = `
    <div class="print-relatorio-titulo">MIKAMI SUSHI</div>
    <div class="print-relatorio-data">Relatório do Dia — ${dataFormatada}</div>
    <div class="print-relatorio-data">Impresso em ${new Date().toLocaleString("pt-BR")}</div>

    <div class="print-relatorio-resumo">
      <div class="print-relatorio-resumo-linha">
        <span>Total do dia</span>
        <span><strong>${fmtMoeda(totalDia)}</strong></span>
      </div>
      <div class="print-relatorio-resumo-linha">
        <span>Mesas fechadas</span>
        <span>${qtdMesas}</span>
      </div>
      <div class="print-relatorio-resumo-linha">
        <span>Ticket médio</span>
        <span>${fmtMoeda(ticketMed)}</span>
      </div>
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0"/>
      ${pagamentosHtml}
    </div>

    <div class="print-section-title">Detalhe por Mesa</div>
    ${vendasHtml}

    <div class="print-footer">
      Mikami Sushi — Sistema de Gestão
    </div>
  `;

  window.print();
}

// ============================================================
// 7. INIT — Detecta página e inicializa o módulo correto
// ============================================================
const pagina = document.body.className;

if      (pagina.includes("page-mesas"))    initIndex();
else if (pagina.includes("page-mesa"))     initMesa();
else if (pagina.includes("page-cozinha"))  initCozinha();
else if (pagina.includes("page-relatorio")) initRelatorio();
