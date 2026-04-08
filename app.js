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
getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
onSnapshot, query, where, orderBy,
serverTimestamp, Timestamp, increment
} from “./firebase.js”;

// ============================================================
// 1. CARDÁPIO — PRODUTOS PRÉ-CARREGADOS
// ============================================================
const CARDAPIO = [
// COMBOS
{ nome: “Combo Temaki Salmão + 10 Hot Roll”,                              categoria: “Combos”,      preco: 37.00, ativo: true },
{ nome: “Combo Mini Dog + 3 Croquetes + 3 Uramaki”,                      categoria: “Combos”,      preco: 32.00, ativo: true },
{ nome: “Combo 10 Hot Skin + 10 Uramaki + 10 Hosomaki Kani”,             categoria: “Combos”,      preco: 43.00, ativo: true },
{ nome: “Combo 20 Hot Roll Sortidas”,                                     categoria: “Combos”,      preco: 32.00, ativo: true },
{ nome: “Combo 2 Joe + 2 Niguiri + 5 Uramaki + 5 Hosomaki + 6 Hot Roll”, categoria: “Combos”,      preco: 46.00, ativo: true },

// INDIVIDUAIS
{ nome: “Uramaki de Salmão”,         categoria: “Individuais”, preco: 16.00, ativo: true },
{ nome: “Hot Roll de Salmão”,        categoria: “Individuais”, preco: 16.00, ativo: true },
{ nome: “Hot Roll de Kani”,          categoria: “Individuais”, preco: 16.00, ativo: true },
{ nome: “Hot Roll Skin”,             categoria: “Individuais”, preco: 16.00, ativo: true },
{ nome: “Hosomaki de Salmão”,        categoria: “Individuais”, preco: 16.00, ativo: true },
{ nome: “Rolinho Primavera (4 un.)”, categoria: “Individuais”, preco: 15.00, ativo: true },
{ nome: “Croquete de Salmão (6 un.)”,categoria: “Individuais”, preco: 15.00, ativo: true },
{ nome: “Kani Queijo (6 un.)”,       categoria: “Individuais”, preco: 15.00, ativo: true },
{ nome: “Hot Dog Salmão”,            categoria: “Individuais”, preco: 30.00, ativo: true },
{ nome: “Hot Dog Salmão e Camarão”,  categoria: “Individuais”, preco: 35.00, ativo: true },
{ nome: “Sunomono”,                  categoria: “Individuais”, preco: 10.00, ativo: true },

// ESPECIAIS
{ nome: “Uramaki Kani com Camarão”,                          categoria: “Especiais”, preco: 27.00, ativo: true },
{ nome: “Uramaki Salmão Geleia”,                             categoria: “Especiais”, preco: 27.00, ativo: true },
{ nome: “Hot Especial”,                                      categoria: “Especiais”, preco: 22.00, ativo: true },
{ nome: “Nathos de Salmão e Geleia (4 un.)”,                 categoria: “Especiais”, preco: 15.00, ativo: true },
{ nome: “Joe (3 un.)”,                                       categoria: “Especiais”, preco: 18.00, ativo: true },
{ nome: “Niguiri (3 un.)”,                                   categoria: “Especiais”, preco: 15.00, ativo: true },
{ nome: “Mikami Supremo 500g”,                               categoria: “Especiais”, preco: 45.00, ativo: true },

// TEMAKIS
{ nome: “Temaki Copo Salmão”, categoria: “Temakis”, preco: 28.00, ativo: true },
{ nome: “Temaki de Salmão”,   categoria: “Temakis”, preco: 25.00, ativo: true },
{ nome: “Temaki de Kani”,     categoria: “Temakis”, preco: 22.00, ativo: true },
{ nome: “Temaki de Skin”,     categoria: “Temakis”, preco: 21.00, ativo: true },
{ nome: “Temaki de Camarão”,  categoria: “Temakis”, preco: 30.00, ativo: true },

// YAKISOBA
{ nome: “Yakisoba Individual”,  categoria: “Yakisoba”, preco: 20.00, ativo: true },
{ nome: “Yakisoba 2 Pessoas”,   categoria: “Yakisoba”, preco: 30.00, ativo: true },

// DOCES
{ nome: “Harumaki Banana com Nutella”,                           categoria: “Doces”, preco: 20.00, ativo: true },
{ nome: “Harumaki Nutella + Doce de Leite + Romeu e Julieta”,   categoria: “Doces”, preco: 22.00, ativo: true },

// BEBIDAS
{ nome: “Coca Zero Lata 220ml”,    categoria: “Bebidas”, preco: 4.50, ativo: true },
{ nome: “Coca Lata 350ml”,         categoria: “Bebidas”, preco: 6.00, ativo: true },
{ nome: “Fanta Lata 220ml”,        categoria: “Bebidas”, preco: 6.00, ativo: true },
{ nome: “Kuat Lata 220ml”,         categoria: “Bebidas”, preco: 4.50, ativo: true },
{ nome: “Coca Mini Pet 250ml”,     categoria: “Bebidas”, preco: 5.00, ativo: true },
{ nome: “Coca Zero Mini Pet 250ml”,categoria: “Bebidas”, preco: 5.00, ativo: true },
{ nome: “Água”,                    categoria: “Bebidas”, preco: 3.00, ativo: true },
{ nome: “Água com Gás”,            categoria: “Bebidas”, preco: 4.00, ativo: true },
];

const TOTAL_MESAS = 12;

// ============================================================
// 2. UTILITÁRIOS
// ============================================================

function fmtMoeda(v) {
return Number(v || 0).toLocaleString(“pt-BR”, { style: “currency”, currency: “BRL” });
}

function fmtHora(ts) {
if (!ts) return “—”;
const d = ts.toDate ? ts.toDate() : new Date(ts);
return d.toLocaleTimeString(“pt-BR”, { hour: “2-digit”, minute: “2-digit” });
}

function fmtDataHora(ts) {
if (!ts) return “—”;
const d = ts.toDate ? ts.toDate() : new Date(ts);
return d.toLocaleDateString(“pt-BR”, { day: “2-digit”, month: “2-digit” }) +
“ “ + d.toLocaleTimeString(“pt-BR”, { hour: “2-digit”, minute: “2-digit” });
}

function fmtTempo(ts) {
if (!ts) return “”;
const d = ts.toDate ? ts.toDate() : new Date(ts);
const diff = Math.floor((Date.now() - d.getTime()) / 1000);
if (diff < 60)   return `${diff}s`;
if (diff < 3600) return `${Math.floor(diff / 60)}min`;
return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}min`;
}

function toast(msg, tipo = “info”) {
let container = document.getElementById(“toastContainer”);
if (!container) {
container = document.createElement(“div”);
container.id = “toastContainer”;
container.className = “toast-container”;
document.body.appendChild(container);
}
const el = document.createElement(“div”);
el.className = `toast ${tipo}`;
el.textContent = msg;
container.appendChild(el);
setTimeout(() => el.remove(), 3200);
}

function iniciarRelogio() {
const el = document.getElementById(“headerClock”);
if (!el) return;
const atualizar = () => {
el.textContent = new Date().toLocaleTimeString(“pt-BR”, {
hour: “2-digit”, minute: “2-digit”, second: “2-digit”
});
};
atualizar();
setInterval(atualizar, 1000);
}

// ── SEED: chave de versão no localStorage ────────────────────
// Só roda seeds se nunca rodou neste dispositivo ou versão mudou
const SEED_VERSION = `mikami_seed_v${CARDAPIO.length}_m${TOTAL_MESAS}`;

async function garantirProdutos() {
if (localStorage.getItem(SEED_VERSION + “_prod”) === “ok”) return;
try {
const snap = await getDocs(collection(db, “produtos”));
if (snap.size >= CARDAPIO.length) {
localStorage.setItem(SEED_VERSION + “_prod”, “ok”);
return;
}
const existentes = new Set(snap.docs.map(d => d.id));
await Promise.all(CARDAPIO.map((p, i) => {
const id = `prod_${i.toString().padStart(3, "0")}`;
return existentes.has(id) ? Promise.resolve() : setDoc(doc(db, “produtos”, id), p);
}));
localStorage.setItem(SEED_VERSION + “_prod”, “ok”);
console.log(”[Mikami] Cardápio carregado.”);
} catch (err) { console.error(”[Mikami] Seed produtos:”, err); }
}

async function garantirMesas() {
if (localStorage.getItem(SEED_VERSION + “_mesas”) === “ok”) return;
try {
const snap = await getDocs(collection(db, “mesas”));
const existentes = new Set(snap.docs.map(d => d.id));
const promises = [];
for (let i = 1; i <= TOTAL_MESAS; i++) {
const id = `mesa_${i}`;
if (!existentes.has(id)) {
promises.push(setDoc(doc(db, “mesas”, id), {
numero: i, status: “livre”, abertaEm: null,
total: 0, pedidosCount: 0, historicoPedidos: []
}));
}
}
if (promises.length) await Promise.all(promises);
localStorage.setItem(SEED_VERSION + “_mesas”, “ok”);
} catch (err) { console.error(”[Mikami] Seed mesas:”, err); }
}

// ============================================================
// 3. PÁGINA: INDEX — MESAS
// ============================================================
function initIndex() {
iniciarRelogio();

// UI carrega IMEDIATAMENTE — seeds rodam em paralelo no background
// OTIMIZAÇÃO: debounce de 80ms — agrupa múltiplos snapshots simultâneos
let _debounceTimer = null;
const _unsubMesas = onSnapshot(collection(db, “mesas”), snap => {
clearTimeout(_debounceTimer);
_debounceTimer = setTimeout(() => {
const mesas = [];
snap.forEach(d => mesas.push({ id: d.id, …d.data() }));
mesas.sort((a, b) => a.numero - b.numero);
renderMesas(mesas);
renderStats(mesas);
}, 80);
});
// Cancela listener ao sair da página
window.addEventListener(“pagehide”, () => { _unsubMesas(); clearTimeout(_debounceTimer); }, { once: true });

escutarFaturamentoDia();

// Seeds em background, sem bloquear UI
Promise.all([garantirProdutos(), garantirMesas()]).catch(console.error);
}

// Cache para diff de mesas — evita redesenhar cards que não mudaram
const _mesaHash = new Map();

function _hashMesa(m) {
return `${m.status}|${m.total}|${m.pedidosCount}|${m.abertaEm?.seconds||0}`;
}

function _htmlCard(mesa, statusLabel) {
// Recalcula total pelo historicoPedidos se disponível
const totalExibir = (mesa.historicoPedidos?.length)
? mesa.historicoPedidos.reduce((a,p) => a+(p.total||0), 0)
: (mesa.total || 0);

return `<div class="mesa-card ${mesa.status}" data-mesa-id="${mesa.id}" data-mesa-num="${mesa.numero}"> <div class="mesa-card-header"> <div class="mesa-numero">${mesa.numero}</div> <div class="mesa-status-pill status-${mesa.status}"> ${statusLabel[mesa.status] || mesa.status} </div> </div> <div class="mesa-card-info"> <div class="mesa-total">${mesa.status !== "livre" ? fmtMoeda(totalExibir) : "—"}</div> <div class="mesa-meta"> ${mesa.abertaEm ?`<span>Aberta: ${fmtHora(mesa.abertaEm)}</span>`: "<span>Mesa livre</span>"} ${mesa.pedidosCount ?`<span>${mesa.pedidosCount} pedido(s)</span>`: ""} </div> </div> </div>`;
}

function renderMesas(mesas) {
const grid = document.getElementById(“mesasGrid”);
if (!grid) return;
const statusLabel = { livre: “Livre”, ocupada: “Ocupada”, aguardando: “Aguardando Pagto.” };

// Primeira vez: renderiza tudo de uma vez com fragment (rápido)
if (!grid.querySelector(”.mesa-card”)) {
grid.innerHTML = mesas.map(m => _htmlCard(m, statusLabel)).join(””);
mesas.forEach(m => _mesaHash.set(m.id, _hashMesa(m)));
grid.querySelectorAll(”.mesa-card”).forEach(c => {
c.addEventListener(“click”, () => { window.location.href = `mesa.html?mesa=${c.dataset.mesaNum}`; });
});
return;
}

// Atualizações seguintes: diff — só redesenha o card que mudou
mesas.forEach(mesa => {
const novoHash = _hashMesa(mesa);
if (_mesaHash.get(mesa.id) === novoHash) return; // sem mudança, pula
_mesaHash.set(mesa.id, novoHash);

```
const antigo = grid.querySelector(`[data-mesa-id="${mesa.id}"]`);
const tmp = document.createElement("div");
tmp.innerHTML = _htmlCard(mesa, statusLabel);
const novo = tmp.firstElementChild;
novo.addEventListener("click", () => { window.location.href = `mesa.html?mesa=${novo.dataset.mesaNum}`; });

if (antigo) grid.replaceChild(novo, antigo);
else grid.appendChild(novo);
```

});
}

function _criarCardMesa(mesa, statusLabel) {
const card = document.createElement(“div”);
card.className = `mesa-card ${mesa.status}`;
card.dataset.mesaId = mesa.id;
card.dataset.mesaNumero = mesa.numero;
card.innerHTML = `<div class="mesa-card-header"> <div class="mesa-numero">${mesa.numero}</div> <div class="mesa-status-pill status-${mesa.status}"> ${statusLabel[mesa.status] || mesa.status} </div> </div> <div class="mesa-card-info"> <div class="mesa-total">${mesa.status !== "livre" ? fmtMoeda(mesa.total || 0) : "—"}</div> <div class="mesa-meta"> ${mesa.abertaEm ?`<span>Aberta: ${fmtHora(mesa.abertaEm)}</span>`: "<span>Mesa livre</span>"} ${mesa.pedidosCount ?`<span>${mesa.pedidosCount} pedido(s)</span>`: ""} </div> </div>`;
card.addEventListener(“click”, () => {
window.location.href = `mesa.html?mesa=${mesa.numero}`;
});
return card;
}

function renderStats(mesas) {
document.getElementById(“statLivres”).textContent     = mesas.filter(m => m.status === “livre”).length;
document.getElementById(“statOcupadas”).textContent   = mesas.filter(m => m.status === “ocupada”).length;
document.getElementById(“statAguardando”).textContent = mesas.filter(m => m.status === “aguardando”).length;
}

function escutarFaturamentoDia() {
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const inicioHoje = Timestamp.fromDate(hoje);

const q = query(collection(db, “vendas”), where(“fechadoEm”, “>=”, inicioHoje));

onSnapshot(q, snap => {
let total = 0;
snap.forEach(d => { total += d.data().total || 0; });
const el = document.getElementById(“statTotalDia”);
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
categoriaAtiva: “Todos”,
buscaTermo: “”
};

async function initMesa() {
iniciarRelogio();

const params = new URLSearchParams(window.location.search);
estadoMesa.numero = parseInt(params.get(“mesa”)) || 1;
estadoMesa.mesaId = `mesa_${estadoMesa.numero}`;

document.getElementById(“mesaNumeroBadge”).textContent = `Mesa ${estadoMesa.numero}`;
document.title = `Mesa ${estadoMesa.numero} — Mikami Sushi`;

// Tenta usar cache do sessionStorage para cardápio (evita leitura repetida)
try {
const cacheKey = `mikami_produtos_${SEED_VERSION}`;
const cached = sessionStorage.getItem(cacheKey);
if (cached) {
estadoMesa.produtos = JSON.parse(cached);
} else {
const snapProd = await getDocs(collection(db, “produtos”));
snapProd.forEach(d => estadoMesa.produtos.push({ id: d.id, …d.data() }));
estadoMesa.produtos.sort((a, b) => a.nome.localeCompare(b.nome));
sessionStorage.setItem(cacheKey, JSON.stringify(estadoMesa.produtos));
}
} catch (err) {
toast(“Erro ao carregar cardápio.”, “erro”);
console.error(err);
}

renderCategorias();
renderProdutos();

// Escuta a mesa em tempo real
onSnapshot(doc(db, “mesas”, estadoMesa.mesaId), snap => {
if (!snap.exists()) return;
estadoMesa.dadosMesa = snap.data();
atualizarHeaderMesa();
renderConta();
});

// Eventos
document.getElementById(“buscaProduto”).addEventListener(“input”, e => {
estadoMesa.buscaTermo = e.target.value.toLowerCase();
renderProdutos();
});

document.getElementById(“btnConfirmarPedido”).addEventListener(“click”, confirmarPedido);
document.getElementById(“btnImprimirCozinha”).addEventListener(“click”, imprimirCozinha);
document.getElementById(“btnImprimirConta”).addEventListener(“click”, imprimirConta);
document.getElementById(“btnFecharMesa”).addEventListener(“click”, abrirModalFechar);
document.getElementById(“btnCancelarFechar”).addEventListener(“click”, fecharModal);
document.getElementById(“btnConfirmarFechar”).addEventListener(“click”, fecharMesa);

document.querySelectorAll(”.pagamento-btn”).forEach(btn => {
btn.addEventListener(“click”, () => {
document.querySelectorAll(”.pagamento-btn”).forEach(b => b.classList.remove(“selected”));
btn.classList.add(“selected”);
document.getElementById(“btnConfirmarFechar”).disabled = false;
});
});

// Modal editar pedido
document.getElementById(“btnCancelarEdicao”)?.addEventListener(“click”, fecharModalEditar);
document.getElementById(“btnSalvarEdicao”)?.addEventListener(“click”, salvarEdicaoPedido);

// Modal pagamento dividido
initModalPagamento();
}

// ── Cardápio ──────────────────────────────────────────────
function renderCategorias() {
const cats = [“Todos”, …new Set(estadoMesa.produtos.map(p => p.categoria))];
const container = document.getElementById(“categoriasTabs”);
container.innerHTML = cats.map(c => `<button class="cat-btn ${c === estadoMesa.categoriaAtiva ? "active" : ""}" data-cat="${c}">${c}</button>`).join(””);

container.querySelectorAll(”.cat-btn”).forEach(btn => {
btn.addEventListener(“click”, () => {
estadoMesa.categoriaAtiva = btn.dataset.cat;
container.querySelectorAll(”.cat-btn”).forEach(b => b.classList.remove(“active”));
btn.classList.add(“active”);
renderProdutos();
});
});
}

function renderProdutos() {
let lista = estadoMesa.produtos.filter(p => p.ativo !== false);

if (estadoMesa.categoriaAtiva !== “Todos”) {
lista = lista.filter(p => p.categoria === estadoMesa.categoriaAtiva);
}

if (estadoMesa.buscaTermo) {
lista = lista.filter(p => p.nome.toLowerCase().includes(estadoMesa.buscaTermo));
}

const container = document.getElementById(“produtosLista”);

if (!lista.length) {
container.innerHTML = `<div class="pedido-vazio"><p>Nenhum produto encontrado.</p></div>`;
return;
}

container.innerHTML = lista.map(p => `<div class="produto-card" data-id="${p.id}"> <div class="produto-info"> <span class="produto-nome">${p.nome}</span> <span class="produto-cat-tag">${p.categoria}</span> </div> <span class="produto-preco">${fmtMoeda(p.preco)}</span> <button class="produto-add-btn" data-id="${p.id}" title="Adicionar ao pedido">+</button> </div>`).join(””);

container.querySelectorAll(”.produto-add-btn”).forEach(btn => {
btn.addEventListener(“click”, e => {
e.stopPropagation();
adicionarAoPedido(btn.dataset.id);
});
});

container.querySelectorAll(”.produto-card”).forEach(card => {
card.addEventListener(“click”, () => {
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
obs: “”
});
}

renderPedidoAtual();
toast(`${prod.nome} adicionado`, “sucesso”);
}

function renderPedidoAtual() {
const container = document.getElementById(“pedidoItens”);
const itens = estadoMesa.pedidoAtual;

const totalPedido = itens.reduce((acc, i) => acc + i.preco * i.qty, 0);

document.getElementById(“pedidoCount”).textContent           = `${itens.length} item(ns)`;
document.getElementById(“pedidoTotal”).textContent           = fmtMoeda(totalPedido);
document.getElementById(“btnConfirmarPedido”).disabled       = itens.length === 0;

if (!itens.length) {
container.innerHTML = ` <div class="pedido-vazio"> <span class="pedido-vazio-icon">🍱</span> <p>Nenhum item adicionado</p> </div>`;
return;
}

container.innerHTML = itens.map((item, idx) => `<div class="pedido-item" data-idx="${idx}"> <div class="pedido-item-header"> <span class="pedido-item-nome">${item.nome}</span> <span class="pedido-item-subtotal">${fmtMoeda(item.preco * item.qty)}</span> <button class="remove-item-btn" data-idx="${idx}" title="Remover item">✕</button> </div> <div class="pedido-item-controls"> <button class="qty-btn" data-idx="${idx}" data-acao="dec">−</button> <span class="qty-value">${item.qty}</span> <button class="qty-btn" data-idx="${idx}" data-acao="inc">+</button> <span style="font-size:0.68rem;color:var(--cinza-texto);margin-left:0.3rem"> ${fmtMoeda(item.preco)} un. </span> </div> <textarea class="obs-input" placeholder="Observação (ex: sem cream cheese)" data-idx="${idx}" >${item.obs}</textarea> </div>`).join(””);

container.querySelectorAll(”.qty-btn”).forEach(btn => {
btn.addEventListener(“click”, () => {
const idx = parseInt(btn.dataset.idx);
if (btn.dataset.acao === “inc”) {
estadoMesa.pedidoAtual[idx].qty++;
} else {
estadoMesa.pedidoAtual[idx].qty–;
if (estadoMesa.pedidoAtual[idx].qty <= 0) {
estadoMesa.pedidoAtual.splice(idx, 1);
}
}
renderPedidoAtual();
});
});

container.querySelectorAll(”.remove-item-btn”).forEach(btn => {
btn.addEventListener(“click”, () => {
estadoMesa.pedidoAtual.splice(parseInt(btn.dataset.idx), 1);
renderPedidoAtual();
});
});

container.querySelectorAll(”.obs-input”).forEach(input => {
input.addEventListener(“input”, () => {
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

const btn = document.getElementById(“btnConfirmarPedido”);
btn.disabled = true;
btn.textContent = “Enviando…”;

try {
const totalPedido = itens.reduce((acc, i) => acc + i.preco * i.qty, 0);

```
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
```

} catch (err) {
console.error(”[Mikami] Erro ao confirmar pedido:”, err);
toast(“Erro ao confirmar pedido. Tente novamente.”, “erro”);
} finally {
btn.textContent = “Confirmar Pedido →”;
btn.disabled = estadoMesa.pedidoAtual.length === 0;
}
}

// ── Conta da mesa ─────────────────────────────────────────
function atualizarHeaderMesa() {
const mesa = estadoMesa.dadosMesa;
if (!mesa) return;

const statusMap = { livre: “Livre”, ocupada: “Ocupada”, aguardando: “Aguardando Pagto.” };
const badge = document.getElementById(“mesaStatusBadge”);
badge.textContent = statusMap[mesa.status] || mesa.status;
badge.className   = `mesa-status-badge ${mesa.status}`;

document.getElementById(“mesaAbertura”).textContent =
mesa.abertaEm ? `Aberta às ${fmtHora(mesa.abertaEm)}` : “Mesa livre”;

// FIX: usa historicoPedidos como fonte da verdade para o total exibido
const totalHistorico = (mesa.historicoPedidos || []).reduce((a, p) => a + (p.total || 0), 0);
const total = totalHistorico || mesa.total || 0;
document.getElementById(“contaTotalBadge”).textContent = fmtMoeda(total);
document.getElementById(“contaTotalFinal”).textContent = fmtMoeda(total);
document.getElementById(“modalTotalCobrar”)?.textContent && (document.getElementById(“modalTotalCobrar”).textContent = fmtMoeda(total));
}

function renderConta() {
const mesa = estadoMesa.dadosMesa;
if (!mesa) return;

const container = document.getElementById(“contaHistorico”);
const historico  = mesa.historicoPedidos || [];

if (!historico.length) {
container.innerHTML = `<div class="conta-vazia"><span>Nenhum pedido confirmado ainda.</span></div>`;
return;
}

const badgeClass = {
“Novo”:       “badge-novo”,
“Em preparo”: “badge-preparo”,
“Pronto”:     “badge-pronto”,
“Entregue”:   “badge-entregue”
};

container.innerHTML = historico.map((pedido, idx) => {
const itemsHtml = (pedido.itens || []).map(item => `<div class="conta-item-linha"> <span class="conta-item-nome">${item.nome}</span> <span class="conta-item-qty">${item.qty}x</span> <span class="conta-item-val">${fmtMoeda(item.preco * item.qty)}</span> </div> ${item.obs ?`<div class="conta-item-obs">↳ ${item.obs}</div>`: ""}`).join(””);

```
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
```

}).join(””);

// Rola para o final automaticamente
container.scrollTop = container.scrollHeight;

// Eventos editar pedido
container.querySelectorAll(”.btn-editar-pedido-conta”).forEach(btn => {
btn.addEventListener(“click”, () => abrirModalEditar(btn.dataset.pedidoId));
});
}

// ── Impressão ─────────────────────────────────────────────

// FIX: imprime todos os pedidos não-entregues, não só o último
function imprimirCozinha() {
const mesa = estadoMesa.dadosMesa;
if (!mesa || !mesa.historicoPedidos?.length) {
toast(“Nenhum pedido para imprimir.”, “erro”);
return;
}

// Pega todos os pedidos com status Novo ou Em preparo
const pedidosParaImprimir = mesa.historicoPedidos.filter(
p => p.status === “Novo” || p.status === “Em preparo”
);

// Se não houver pedidos nesse estado, usa o último
const alvo = pedidosParaImprimir.length > 0
? pedidosParaImprimir
: [mesa.historicoPedidos[mesa.historicoPedidos.length - 1]];

const pedidosHtml = alvo.map((pedido, idx) => {
const itensHtml = (pedido.itens || []).map(item => `<div class="print-item"> <span>${item.qty}x ${item.nome}</span> </div> ${item.obs ?`<div class="print-item-obs">→ ${item.obs}</div>`: ""}`).join(””);
return `<div class="print-section-title">PEDIDO ${idx + 1}</div> ${itensHtml}`;
}).join(””);

document.getElementById(“printArea”).innerHTML = `<div class="print-header"> <h2>MIKAMI SUSHI</h2> <p>— PEDIDO COZINHA —</p> <p>Mesa: <strong>${estadoMesa.numero}</strong></p> <p>${new Date().toLocaleString("pt-BR")}</p> </div> ${pedidosHtml} <div class="print-footer">Impresso em ${new Date().toLocaleTimeString("pt-BR")}</div>`;

window.print();
}

function imprimirConta() {
const mesa = estadoMesa.dadosMesa;
if (!mesa || !mesa.historicoPedidos?.length) {
toast(“Nenhum item na conta.”, “erro”);
return;
}

// ── Lógica de dados: inalterada ──────────────────────────
const todosItens = [];
(mesa.historicoPedidos || []).forEach(pedido => {
(pedido.itens || []).forEach(item => {
const exist = todosItens.find(i => i.nome === item.nome && !item.obs && !i.obs);
if (exist) {
exist.qty      += item.qty;
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

// Total pela fonte da verdade (historicoPedidos)
const totalReal = (mesa.historicoPedidos || [])
.reduce((acc, p) => acc + (p.total || 0), 0);

// ── HTML térmico: formato cupom 58mm ─────────────────────
// Largura útil ~32 chars em Courier 12pt no papel 58mm
const SEP  = “––––––––––––––––”;
const SEP2 = “================================”;

// Função para alinhar item e valor na mesma linha com pontos
function linhaTermica(desc, valor) {
const maxDesc  = 20;
const valStr   = valor;
const descCort = desc.length > maxDesc ? desc.substring(0, maxDesc) : desc;
const dots     = “.”.repeat(Math.max(1, 32 - descCort.length - valStr.length));
return `<div class="tc-linha">${descCort}<span>${dots}${valStr}</span></div>`;
}

const dataHora = new Date().toLocaleString(“pt-BR”, {
day: “2-digit”, month: “2-digit”, year: “numeric”,
hour: “2-digit”, minute: “2-digit”
});

const itensHtml = todosItens.map(item => {
const desc = `${item.qty}x ${item.nome}`;
const val  = fmtMoeda(item.subtotal);
return linhaTermica(desc, val)
+ (item.obs ? `<div class="tc-obs"> -> ${item.obs}</div>` : “”);
}).join(””);

document.getElementById(“printArea”).innerHTML = `<div class="cupom-termico"> <div class="tc-centro tc-negrito tc-grande">MIKAMI SUSHI</div> <div class="tc-centro tc-sep">- - - PRE-CONTA - - -</div> <div class="tc-centro">Mesa: <strong>${estadoMesa.numero}</strong></div> <div class="tc-centro">${dataHora}</div> <div class="tc-sep">${SEP}</div> <div class="tc-titulo">ITENS CONSUMIDOS</div> <div class="tc-sep">${SEP}</div> ${itensHtml} <div class="tc-sep">${SEP2}</div> <div class="tc-total">${linhaTermica("TOTAL", fmtMoeda(totalReal))}</div> <div class="tc-sep">${SEP2}</div> <div class="tc-centro tc-rodape">Obrigado pela visita!</div> <div class="tc-centro tc-rodape">Mikami Sushi</div> <div class="tc-espaco"></div> </div>`;

window.print();
}

// ── Fechar mesa ───────────────────────────────────────────
function abrirModalFechar() {
const mesa = estadoMesa.dadosMesa;
if (!mesa || mesa.status === “livre”) {
toast(“Mesa já está livre.”, “info”);
return;
}
if ((mesa.total || 0) <= 0) {
toast(“Conta zerada. Nada a fechar.”, “info”);
return;
}
document.getElementById(“modalFecharMesa”).classList.add(“open”);
}

function fecharModal() {
document.getElementById(“modalFecharMesa”).classList.remove(“open”);
document.querySelectorAll(”.pagamento-btn”).forEach(b => b.classList.remove(“selected”));
document.getElementById(“btnConfirmarFechar”).disabled = true;
// Reset divisão
const tabUnico = document.getElementById(“tabPagUnico”);
const tabDivid = document.getElementById(“tabPagDividido”);
if (tabUnico) { tabUnico.classList.add(“active”); tabDivid.classList.remove(“active”); }
const secUnico = document.getElementById(“secPagUnico”);
const secDivid = document.getElementById(“secPagDividido”);
if (secUnico) { secUnico.style.display = “”; secDivid.style.display = “none”; }
document.querySelectorAll(”.div-valor-input”).forEach(i => i.value = “”);
document.querySelectorAll(”.div-toggle”).forEach(b => b.classList.remove(“active”));
atualizarRestante();
}

async function fecharMesa() {
const btnFechar = document.getElementById(“btnConfirmarFechar”);
if (btnFechar.disabled) return;

// Detecta modo: único ou dividido
const isDividido = document.getElementById(“tabPagDividido”)?.classList.contains(“active”);
let formaPagamento = “”;
let pagamentos = [];

if (isDividido) {
// Coleta valores digitados
document.querySelectorAll(”.div-toggle.active”).forEach(btn => {
const metodo = btn.dataset.metodo;
const input  = document.querySelector(`.div-valor-input[data-metodo="${metodo}"]`);
const val    = parseFloat(input?.value?.replace(”,”, “.”) || “0”);
if (val > 0) pagamentos.push({ metodo, valor: val });
});
if (!pagamentos.length) { toast(“Selecione ao menos um método de pagamento.”, “erro”); return; }
formaPagamento = pagamentos.map(p => `${p.metodo} (${fmtMoeda(p.valor)})`).join(” + “);
} else {
const metodoBtn = document.querySelector(”.pagamento-btn.selected”);
if (!metodoBtn) return;
formaPagamento = metodoBtn.dataset.metodo;
pagamentos = [{ metodo: formaPagamento, valor: estadoMesa.dadosMesa?.total || 0 }];
}

btnFechar.disabled   = true;
btnFechar.textContent = “Fechando…”;

try {
const mesa = estadoMesa.dadosMesa;

```
// FIX: recalcula o total somando historicoPedidos (fonte da verdade)
// Evita usar mesa.total que pode estar errado por race condition
const historico = mesa.historicoPedidos || [];
const totalReal = historico.reduce((acc, p) => acc + (p.total || 0), 0);

// Salva venda no histórico
await addDoc(collection(db, "vendas"), {
  mesaNumero:     estadoMesa.numero,
  mesaId:         estadoMesa.mesaId,
  itens:          historico.flatMap(p => p.itens || []),
  total:          totalReal,
  formaPagamento: formaPagamento,
  pagamentos:     pagamentos,
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
```

} catch (err) {
console.error(”[Mikami] Erro ao fechar mesa:”, err);
toast(“Erro ao fechar mesa. Tente novamente.”, “erro”);
btnFechar.disabled   = false;
btnFechar.textContent = “Confirmar Fechamento”;
}
}

// ============================================================
// 5. PÁGINA: COZINHA
// ============================================================
let filtroAtivo    = “todos”;
let pedidosCached  = [];  // FIX: cache local para re-renderizar no filtro

function initCozinha() {
iniciarRelogio();
// Bind modal editar na cozinha
document.getElementById(“btnCancelarEdicaoCozinha”)?.addEventListener(“click”, fecharModalEditar);
document.getElementById(“btnSalvarEdicaoCozinha”)?.addEventListener(“click”, salvarEdicaoPedido);

// FIX: filtro re-renderiza com dados em cache, sem precisar de novo snapshot
document.querySelectorAll(”.filtro-btn”).forEach(btn => {
btn.addEventListener(“click”, () => {
filtroAtivo = btn.dataset.filtro;
document.querySelectorAll(”.filtro-btn”).forEach(b => b.classList.remove(“active”));
btn.classList.add(“active”);
renderCozinha(pedidosCached);  // usa cache
});
});

// FIX: filtra apenas pedidos de hoje
const _inicioCozinha = new Date();
_inicioCozinha.setHours(0, 0, 0, 0);
const q = query(
collection(db, “pedidos”),
where(“createdAt”, “>=”, Timestamp.fromDate(_inicioCozinha)),
orderBy(“createdAt”, “desc”)
);

// OTIMIZAÇÃO: throttle 200ms — evita re-render em rajadas de pedidos
let _throttleCozinha = null;
const _unsubCoz = onSnapshot(q, snap => {
const dados = [];
snap.forEach(d => dados.push({ id: d.id, …d.data() }));
if (_throttleCozinha) return; // já tem render agendado
_throttleCozinha = setTimeout(() => {
_throttleCozinha = null;
pedidosCached = dados;
renderCozinha(pedidosCached);
const ativos = pedidosCached.filter(p => p.status !== “Entregue”);
const el = document.getElementById(“pedidosAtivosCount”);
if (el) el.textContent = `${ativos.length} pedido(s) ativo(s)`;
}, 200);
});
window.addEventListener(“pagehide”, () => { _unsubCoz(); clearTimeout(_throttleCozinha); }, { once: true });

// Atualiza tempos a cada 30s
setInterval(() => {
document.querySelectorAll(”.pedido-card-tempo[data-ts]”).forEach(el => {
const ts = parseInt(el.dataset.ts);
if (ts) el.textContent = fmtTempo({ toDate: () => new Date(ts) });
});
}, 30000);
}

function renderCozinha(pedidos) {
const grid = document.getElementById(“pedidosGrid”);

let filtrados = pedidos;
if (filtroAtivo !== “todos”) {
filtrados = pedidos.filter(p => p.status === filtroAtivo);
}

if (!filtrados.length) {
grid.innerHTML = `<div class="loading-mesas" style="grid-column:1/-1"> <span style="font-size:2rem">🍣</span> <p>${filtroAtivo === "todos" ? "Nenhum pedido ativo." :`Nenhum pedido com status “${filtroAtivo}”.`}</p> </div>`;
return;
}

const statusClass = {
“Novo”:       “status-novo”,
“Em preparo”: “status-preparo”,
“Pronto”:     “status-pronto”,
“Entregue”:   “status-entregue”
};

const badgeClass = {
“Novo”:       “badge-novo”,
“Em preparo”: “badge-preparo”,
“Pronto”:     “badge-pronto”,
“Entregue”:   “badge-entregue”
};

grid.innerHTML = filtrados.map(pedido => {
const tsMs = pedido.createdAt?.toMillis ? pedido.createdAt.toMillis() : null;

```
const itensHtml = (pedido.itens || []).map(item => `
  <div class="pedido-card-item">
    <span class="pedido-card-item-qty">${item.qty}x</span>
    <span class="pedido-card-item-nome">${item.nome}</span>
    ${item.obs ? `<span class="pedido-card-item-obs">→ ${item.obs}</span>` : ""}
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
```

}).join(””);

grid.querySelectorAll(”[data-id][data-status]”).forEach(btn => {
btn.addEventListener(“click”, () =>
atualizarStatusPedido(btn.dataset.id, btn.dataset.status)
);
});

grid.querySelectorAll(”.btn-excluir-pedido”).forEach(btn => {
btn.addEventListener(“click”, () =>
excluirPedido(btn.dataset.excluirId, btn.dataset.mesaId, parseFloat(btn.dataset.total))
);
});

grid.querySelectorAll(”.btn-editar-cozinha”).forEach(btn => {
btn.addEventListener(“click”, () => abrirModalEditarCozinha(btn.dataset.pedidoId));
});
}

async function atualizarStatusPedido(pedidoId, novoStatus) {
try {
// OTIMIZAÇÃO: busca pedido e atualiza status em paralelo
const [_, pedidoSnap] = await Promise.all([
updateDoc(doc(db, “pedidos”, pedidoId), {
status:    novoStatus,
updatedAt: serverTimestamp()
}),
getDoc(doc(db, “pedidos”, pedidoId))
]);

```
if (!pedidoSnap.exists()) return;
const pedidoData = pedidoSnap.data();

// Atualiza historicoPedidos da mesa em paralelo com o toast
const mesaRef  = doc(db, "mesas", pedidoData.mesaId);
const mesaSnap = await getDoc(mesaRef);
if (!mesaSnap.exists()) { toast(`Pedido: ${novoStatus}`, "sucesso"); return; }

const historico = (mesaSnap.data().historicoPedidos || []).map(p =>
  p.pedidoId === pedidoId ? { ...p, status: novoStatus } : p
);
await updateDoc(mesaRef, { historicoPedidos: historico });
toast(`Pedido marcado como: ${novoStatus}`, "sucesso");
```

} catch (err) {
console.error(”[Mikami] Erro ao atualizar pedido:”, err);
toast(“Erro ao atualizar pedido.”, “erro”);
}
}

async function excluirPedido(pedidoId, mesaId, totalPedido) {
if (!confirm(“Excluir este pedido? Esta ação não pode ser desfeita.”)) return;

try {
// Remove da coleção pedidos
await deleteDoc(doc(db, “pedidos”, pedidoId));

```
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
```

} catch (err) {
console.error(”[Mikami] Erro ao excluir pedido:”, err);
toast(“Erro ao excluir pedido.”, “erro”);
}
}

// ============================================================
// 6. PÁGINA: RELATÓRIO
// ============================================================
let unsubRelatorio = null;  // para limpar listener anterior
let vendasAtuais   = [];      // cache para impressão do relatório

function initRelatorio() {
iniciarRelogio();

// FIX: usa data local, não UTC (evita bug de fuso horário no Brasil)
const _h = new Date();
const hoje = `${_h.getFullYear()}-${String(_h.getMonth()+1).padStart(2,'0')}-${String(_h.getDate()).padStart(2,'0')}`;
const inputData = document.getElementById(“filtroData”);
inputData.value = hoje;

// FIX: usa onSnapshot para atualização em tempo real
inputData.addEventListener(“change”, () => escutarVendas(inputData.value));
document.getElementById(“btnHoje”).addEventListener(“click”, () => {
inputData.value = hoje;
escutarVendas(hoje);
});

// Botão imprimir relatório
const btnImprimir = document.getElementById(“btnImprimirRelatorio”);
if (btnImprimir) {
btnImprimir.addEventListener(“click”, () => {
imprimirRelatorio(inputData.value, vendasAtuais);
});
}

escutarVendas(hoje);
window.addEventListener(‘pagehide’, () => { if (unsubRelatorio) unsubRelatorio(); }, { once: true });
}

function escutarVendas(dataStr) {
// Cancela listener anterior se existir
if (unsubRelatorio) {
unsubRelatorio();
unsubRelatorio = null;
}

// Ajusta as datas corretamente para o fuso local
const [ano, mes, dia] = dataStr.split(”-”).map(Number);
const inicio = new Date(ano, mes - 1, dia, 0, 0, 0);
const fim    = new Date(ano, mes - 1, dia, 23, 59, 59);

const q = query(
collection(db, “vendas”),
where(“fechadoEm”, “>=”,  Timestamp.fromDate(inicio)),
where(“fechadoEm”, “<=”,  Timestamp.fromDate(fim)),
orderBy(“fechadoEm”, “desc”)
);

// Mostra loading
const container = document.getElementById(“vendasLista”);
container.innerHTML = ` <div class="loading-mesas"> <div class="loading-spinner"></div> <p>Carregando...</p> </div>`;

// FIX: onSnapshot em vez de getDocs — relatório reativo
unsubRelatorio = onSnapshot(q, snap => {
const vendas = [];
snap.forEach(d => vendas.push({ id: d.id, …d.data() }));
vendasAtuais = vendas;
renderRelatorio(vendas);
}, err => {
console.error(”[Mikami] Erro ao carregar vendas:”, err);
toast(“Erro ao carregar relatório.”, “erro”);
});
}

function renderRelatorio(vendas) {
const totalDia  = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
const qtdMesas  = vendas.length;
const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

document.getElementById(“resumoTotal”).textContent  = fmtMoeda(totalDia);
document.getElementById(“resumoMesas”).textContent  = qtdMesas;
document.getElementById(“resumoTicket”).textContent = fmtMoeda(ticketMed);

// Breakdown por pagamento
const porPag = {};
vendas.forEach(v => {
const met = v.formaPagamento || “Outros”;
porPag[met] = (porPag[met] || 0) + (v.total || 0);
});

const breakdown = document.getElementById(“pagamentosBreakdown”);
if (Object.keys(porPag).length === 0) {
breakdown.innerHTML = `<span class="resumo-label">Nenhum pagamento</span>`;
} else {
breakdown.innerHTML = Object.entries(porPag).map(([met, val]) => `<div class="pag-linha"> <span class="pag-metodo">${met}</span> <span class="pag-valor">${fmtMoeda(val)}</span> </div>`).join(””);
}

// Lista de vendas
const container = document.getElementById(“vendasLista”);

if (!vendas.length) {
container.innerHTML = ` <div class="loading-mesas"> <span style="font-size:2rem">📋</span> <p>Nenhuma venda registrada nessa data.</p> </div>`;
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

```
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
```

}).join(””);

// Eventos de exclusão de venda
document.querySelectorAll(”.btn-excluir-venda”).forEach(btn => {
btn.addEventListener(“click”, () => excluirVenda(btn.dataset.vendaId));
});
}

// ── Excluir Venda ─────────────────────────────────────────────
async function excluirVenda(vendaId) {
if (!confirm(“Excluir este registro de venda? Esta ação não pode ser desfeita.”)) return;

try {
await deleteDoc(doc(db, “vendas”, vendaId));
toast(“Registro excluído.”, “sucesso”);
// O onSnapshot do relatório atualiza automaticamente
} catch (err) {
console.error(”[Mikami] Erro ao excluir venda:”, err);
toast(“Erro ao excluir registro.”, “erro”);
}
}

// ── Imprimir Relatório ────────────────────────────────────────
function imprimirRelatorio(dataStr, vendas) {
if (!vendas || !vendas.length) {
toast(“Nenhuma venda para imprimir.”, “info”);
return;
}

const [ano, mes, dia] = dataStr.split(”-”).map(Number);
const dataFormatada = new Date(ano, mes - 1, dia)
.toLocaleDateString(“pt-BR”, { day: “2-digit”, month: “2-digit”, year: “numeric” });

const totalDia  = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
const qtdMesas  = vendas.length;
const ticketMed = qtdMesas > 0 ? totalDia / qtdMesas : 0;

// Breakdown por pagamento
const porPag = {};
vendas.forEach(v => {
const met = v.formaPagamento || “Outros”;
porPag[met] = (porPag[met] || 0) + (v.total || 0);
});

const pagamentosHtml = Object.entries(porPag).map(([met, val]) => `<div class="print-relatorio-resumo-linha"> <span>${met}</span> <span>${fmtMoeda(val)}</span> </div>`).join(””);

const vendasHtml = vendas.map((venda, idx) => {
const itensAgrupados = [];
(venda.itens || []).forEach(item => {
const ex = itensAgrupados.find(i => i.nome === item.nome);
if (ex) { ex.qty += item.qty; ex.subtotal += item.preco * item.qty; }
else itensAgrupados.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty });
});

```
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
```

}).join(””);

const printArea = document.getElementById(“printArea”);
if (!printArea) {
toast(“Área de impressão não encontrada.”, “erro”);
return;
}

printArea.innerHTML = `
<div class="print-relatorio-titulo">MIKAMI SUSHI</div>
<div class="print-relatorio-data">Relatório do Dia — ${dataFormatada}</div>
<div class="print-relatorio-data">Impresso em ${new Date().toLocaleString(“pt-BR”)}</div>

```
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
```

`;

window.print();
}

// ── Pagamento dividido — atualiza saldo restante ──────────────
function atualizarRestante() {
const total = estadoMesa.dadosMesa?.total || 0;
let distribuido = 0;
document.querySelectorAll(”.div-toggle.active”).forEach(btn => {
const metodo = btn.dataset.metodo;
const input  = document.querySelector(`.div-valor-input[data-metodo="${metodo}"]`);
distribuido += parseFloat(input?.value?.replace(”,”,”.”) || “0”) || 0;
});
const restante = total - distribuido;
const el = document.getElementById(“divRestante”);
if (el) {
el.textContent = restante > 0.009
? `Faltam distribuir: ${fmtMoeda(restante)}`
: restante < -0.009
? `Excedeu em: ${fmtMoeda(Math.abs(restante))}`
: “✓ Total distribuído”;
el.style.color = Math.abs(restante) < 0.01 ? “var(–verde)” : “var(–vermelho-soft)”;
}
const btnConfirmar = document.getElementById(“btnConfirmarFechar”);
if (btnConfirmar && document.getElementById(“tabPagDividido”)?.classList.contains(“active”)) {
btnConfirmar.disabled = Math.abs(restante) > 0.01;
}
}

// ── Inicializar lógica do modal de pagamento dividido ─────────
function initModalPagamento() {
const tabUnico = document.getElementById(“tabPagUnico”);
const tabDivid = document.getElementById(“tabPagDividido”);
const secUnico = document.getElementById(“secPagUnico”);
const secDivid = document.getElementById(“secPagDividido”);
if (!tabUnico) return;

tabUnico.addEventListener(“click”, () => {
tabUnico.classList.add(“active”); tabDivid.classList.remove(“active”);
secUnico.style.display = “”; secDivid.style.display = “none”;
const btnConfirmar = document.getElementById(“btnConfirmarFechar”);
btnConfirmar.disabled = !document.querySelector(”.pagamento-btn.selected”);
});

tabDivid.addEventListener(“click”, () => {
tabDivid.classList.add(“active”); tabUnico.classList.remove(“active”);
secDivid.style.display = “”; secUnico.style.display = “none”;
atualizarRestante();
});

// Toggles de método dividido
document.querySelectorAll(”.div-toggle”).forEach(btn => {
btn.addEventListener(“click”, () => {
btn.classList.toggle(“active”);
const metodo = btn.dataset.metodo;
const inputRow = document.getElementById(`divRow_${metodo}`);
if (inputRow) inputRow.style.display = btn.classList.contains(“active”) ? “flex” : “none”;
atualizarRestante();
});
});

// Inputs de valor
document.querySelectorAll(”.div-valor-input”).forEach(input => {
input.addEventListener(“input”, atualizarRestante);
});
}

// ── Modal Editar Pedido (mesa.html) ───────────────────────────
let pedidoEmEdicao = null;

async function abrirModalEditar(pedidoId) {
if (!pedidoId) return;
try {
const snap = await getDoc(doc(db, “pedidos”, pedidoId));
if (!snap.exists()) { toast(“Pedido não encontrado.”, “erro”); return; }
pedidoEmEdicao = { id: pedidoId, …snap.data() };
pedidoEmEdicao.itens = pedidoEmEdicao.itens.map(i => ({ …i })); // cópia
renderModalEditar();
const _modal = document.getElementById(“modalEditarPedido”) || document.getElementById(“modalEditarPedidoCozinha”);
if (_modal) _modal.classList.add(“open”);
else { toast(“Erro ao abrir edição.”, “erro”); return; }
} catch (err) {
console.error(”[Mikami] Edição:”, err);
toast(“Erro ao abrir edição.”, “erro”);
}
}

async function abrirModalEditarCozinha(pedidoId) {
await abrirModalEditar(pedidoId);
}

function renderModalEditar() {
if (!pedidoEmEdicao) return;
const container = document.getElementById(“editarItensLista”) || document.getElementById(“editarItensListaCozinha”);
if (!container) return;
const itens = pedidoEmEdicao.itens;
const titulo = document.getElementById(“editarPedidoTitulo”) || document.getElementById(“editarPedidoTituloCozinha”);
if (titulo) titulo.textContent = `Editar Pedido — Mesa ${pedidoEmEdicao.mesaNumero}`;

if (!itens.length) {
container.innerHTML = `<p style="color:var(--cinza-texto);text-align:center;padding:1rem">Nenhum item</p>`;
return;
}

container.innerHTML = itens.map((item, idx) => `<div class="editar-item-row" data-idx="${idx}"> <div class="editar-item-nome">${item.nome}</div> <div class="editar-item-controles"> <button class="qty-btn editar-dec" data-idx="${idx}">−</button> <span class="qty-value">${item.qty}</span> <button class="qty-btn editar-inc" data-idx="${idx}">+</button> <span class="editar-item-preco">${fmtMoeda(item.preco * item.qty)}</span> <button class="remove-item-btn editar-remove" data-idx="${idx}">✕</button> </div> ${item.obs ?`<div class="conta-item-obs">↳ ${item.obs}</div>`: ""} </div>`).join(””);

// Total
const total = itens.reduce((a, i) => a + i.preco * i.qty, 0);
const _elTotal = document.getElementById(“editarTotal”) || document.getElementById(“editarTotalCozinha”);
if (_elTotal) _elTotal.textContent = fmtMoeda(total);

// Eventos
container.querySelectorAll(”.editar-dec”).forEach(btn => {
btn.addEventListener(“click”, () => {
const idx = parseInt(btn.dataset.idx);
pedidoEmEdicao.itens[idx].qty–;
if (pedidoEmEdicao.itens[idx].qty <= 0) pedidoEmEdicao.itens.splice(idx, 1);
renderModalEditar();
});
});
container.querySelectorAll(”.editar-inc”).forEach(btn => {
btn.addEventListener(“click”, () => {
pedidoEmEdicao.itens[parseInt(btn.dataset.idx)].qty++;
renderModalEditar();
});
});
container.querySelectorAll(”.editar-remove”).forEach(btn => {
btn.addEventListener(“click”, () => {
pedidoEmEdicao.itens.splice(parseInt(btn.dataset.idx), 1);
renderModalEditar();
});
});
}

async function salvarEdicaoPedido() {
if (!pedidoEmEdicao) return;
const btnSalvar = document.getElementById(“btnSalvarEdicao”) || document.getElementById(“btnSalvarEdicaoCozinha”);
if (btnSalvar) { btnSalvar.disabled = true; btnSalvar.textContent = “Salvando…”; }

try {
const itensNovos = pedidoEmEdicao.itens;
const novoTotal  = itensNovos.reduce((a, i) => a + i.preco * i.qty, 0);
const totalAntigo = pedidoEmEdicao.total || 0;
const diff = novoTotal - totalAntigo;

```
if (!itensNovos.length) {
  // Se removeu todos os itens, exclui o pedido
  await excluirPedido(pedidoEmEdicao.id, pedidoEmEdicao.mesaId, totalAntigo);
  fecharModalEditar();
  return;
}

// Atualiza pedido
await updateDoc(doc(db, "pedidos", pedidoEmEdicao.id), {
  itens:     itensNovos,
  total:     novoTotal,
  updatedAt: serverTimestamp()
});

// Atualiza mesa: total e historicoPedidos
if (pedidoEmEdicao.mesaId) {
  const mesaRef  = doc(db, "mesas", pedidoEmEdicao.mesaId);
  const mesaSnap = await getDoc(mesaRef);
  if (mesaSnap.exists()) {
    const mesaData  = mesaSnap.data();
    const historico = (mesaData.historicoPedidos || []).map(p =>
      p.pedidoId === pedidoEmEdicao.id
        ? { ...p, itens: itensNovos, total: novoTotal }
        : p
    );
    // FIX: recalcula total somando todos os pedidos do histórico
    // evita acumular erros de race condition em cima de diff
    const totalRecalculado = historico.reduce((a, p) => a + (p.total || 0), 0);
    await updateDoc(mesaRef, {
      historicoPedidos: historico,
      total: Math.max(0, totalRecalculado)
    });
  }
}

toast("Pedido atualizado!", "sucesso");
fecharModalEditar();
```

} catch (err) {
console.error(err);
toast(“Erro ao salvar edição.”, “erro”);
if (btnSalvar) { btnSalvar.disabled = false; btnSalvar.textContent = “Salvar”; }
}
}

function fecharModalEditar() {
pedidoEmEdicao = null;
[“modalEditarPedido”,“modalEditarPedidoCozinha”].forEach(id => {
document.getElementById(id)?.classList.remove(“open”);
});
[“btnSalvarEdicao”,“btnSalvarEdicaoCozinha”].forEach(id => {
const btn = document.getElementById(id);
if (btn) { btn.disabled = false; btn.textContent = “Salvar”; }
});
}

// ============================================================
// 8. PÁGINA: FATURAMENTO
// ============================================================
function initFaturamento() {
iniciarRelogio();

// Carrega dados dos últimos 12 meses + semana atual
const agora = new Date();
const inicioAno = new Date(agora.getFullYear() - 1, agora.getMonth() + 1, 1);
inicioAno.setHours(0,0,0,0);

const q = query(
collection(db, “vendas”),
where(“fechadoEm”, “>=”, Timestamp.fromDate(inicioAno)),
orderBy(“fechadoEm”, “asc”)
);

onSnapshot(q, snap => {
const vendas = [];
snap.forEach(d => vendas.push({ id: d.id, …d.data() }));
renderFaturamento(vendas);
});
}

function renderFaturamento(vendas) {
const agora = new Date();

// ── SEMANAL: últimos 7 dias ─────────────────────────────
const diasSemana = [];
const totalSemana = [];
for (let i = 6; i >= 0; i–) {
const d = new Date(agora);
d.setDate(d.getDate() - i);
d.setHours(0,0,0,0);
const label = d.toLocaleDateString(“pt-BR”, { weekday: “short”, day: “2-digit” });
diasSemana.push(label);
const total = vendas
.filter(v => {
if (!v.fechadoEm) return false;
const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
return vd.toDateString() === d.toDateString();
})
.reduce((a, v) => a + (v.total || 0), 0);
totalSemana.push(parseFloat(total.toFixed(2)));
}

// ── MENSAL: últimos 30 dias, agrupado por dia ───────────
const diasMes = [];
const totalMes = [];
for (let i = 29; i >= 0; i–) {
const d = new Date(agora);
d.setDate(d.getDate() - i);
d.setHours(0,0,0,0);
diasMes.push(d.toLocaleDateString(“pt-BR”, { day: “2-digit”, month: “2-digit” }));
const total = vendas
.filter(v => {
if (!v.fechadoEm) return false;
const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
return vd.toDateString() === d.toDateString();
})
.reduce((a, v) => a + (v.total || 0), 0);
totalMes.push(parseFloat(total.toFixed(2)));
}

// ── ANUAL: últimos 12 meses ─────────────────────────────
const mesesLabel = [];
const totalAnual = [];
for (let i = 11; i >= 0; i–) {
const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
mesesLabel.push(d.toLocaleDateString(“pt-BR”, { month: “short”, year: “2-digit” }));
const total = vendas
.filter(v => {
if (!v.fechadoEm) return false;
const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
return vd.getFullYear() === d.getFullYear() && vd.getMonth() === d.getMonth();
})
.reduce((a, v) => a + (v.total || 0), 0);
totalAnual.push(parseFloat(total.toFixed(2)));
}

// ── CARDS RESUMO ───────────────────────────────────────
const totalHoje = vendas
.filter(v => {
if (!v.fechadoEm) return false;
const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
return vd.toDateString() === agora.toDateString();
})
.reduce((a, v) => a + (v.total || 0), 0);

const totalSemanaNum = totalSemana.reduce((a,b) => a+b, 0);
const totalMesNum    = totalMes.reduce((a,b) => a+b, 0);
const totalAnualNum  = totalAnual.reduce((a,b) => a+b, 0);

document.getElementById(“fatHoje”).textContent   = fmtMoeda(totalHoje);
document.getElementById(“fatSemana”).textContent = fmtMoeda(totalSemanaNum);
document.getElementById(“fatMes”).textContent    = fmtMoeda(totalMesNum);
document.getElementById(“fatAnual”).textContent  = fmtMoeda(totalAnualNum);

// ── FORMA DE PAGAMENTO (pizza) ─────────────────────────
const porPag = {};
vendas.forEach(v => {
const met = (v.formaPagamento || “Outros”).split(” (”)[0].trim();
porPag[met] = (porPag[met] || 0) + (v.total || 0);
});
const pagLabels = Object.keys(porPag);
const pagValues = pagLabels.map(k => parseFloat(porPag[k].toFixed(2)));

// Renderiza gráficos
_renderGrafico(“chartSemanal”,  “bar”,  diasSemana, totalSemana, “Faturamento Diário (7 dias)”);
_renderGrafico(“chartMensal”,   “bar”,  diasMes,    totalMes,    “Faturamento Diário (30 dias)”);
_renderGrafico(“chartAnual”,    “bar”,  mesesLabel, totalAnual,  “Faturamento Mensal (12 meses)”);
_renderGrafico(“chartPagamento”,“doughnut”, pagLabels, pagValues, “Por Forma de Pagamento”);
}

const _chartInstances = {};
function _renderGrafico(canvasId, tipo, labels, data, titulo) {
const canvas = document.getElementById(canvasId);
if (!canvas) return;

// Destrói instância anterior
if (_chartInstances[canvasId]) {
_chartInstances[canvasId].destroy();
}

const cores = [
“rgba(192,57,43,0.85)”,
“rgba(212,160,23,0.85)”,
“rgba(39,174,96,0.85)”,
“rgba(41,128,185,0.85)”,
“rgba(142,68,173,0.85)”,
];

const isBarra = tipo === “bar”;

_chartInstances[canvasId] = new Chart(canvas, {
type: tipo,
data: {
labels,
datasets: [{
label: titulo,
data,
backgroundColor: isBarra ? “rgba(192,57,43,0.75)” : cores,
borderColor:     isBarra ? “rgba(192,57,43,1)”    : cores.map(c => c.replace(“0.85”,“1”)),
borderWidth: isBarra ? 0 : 2,
borderRadius: isBarra ? 6 : 0,
hoverBackgroundColor: isBarra ? “rgba(231,76,60,0.9)” : cores,
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: {
display: tipo === “doughnut”,
labels: { color: “#f0ece6”, font: { family: “Inter”, size: 12 }, padding: 16 }
},
tooltip: {
callbacks: {
label: ctx => ` ${fmtMoeda(ctx.parsed.y ?? ctx.parsed ?? 0)}`
},
backgroundColor: “#1e1e1e”,
titleColor: “#f0ece6”,
bodyColor: “#d4a017”,
borderColor: “#363636”,
borderWidth: 1,
}
},
scales: isBarra ? {
x: {
ticks: { color: “#888”, font: { size: 11, family: “Inter” }, maxRotation: 45 },
grid:  { color: “rgba(255,255,255,0.04)” }
},
y: {
ticks: {
color: “#888”,
font: { size: 11, family: “Inter” },
callback: v => “R$\u00a0” + v.toLocaleString(“pt-BR”)
},
grid: { color: “rgba(255,255,255,0.06)” }
}
} : {}
}
});
}

// ============================================================
// 7. INIT — Detecta página e inicializa o módulo correto
// ============================================================
const pagina = document.body.className;

if      (pagina.includes(“page-mesas”))    initIndex();
else if (pagina.includes(“page-mesa”))     initMesa();
else if (pagina.includes(“page-cozinha”))  initCozinha();
else if (pagina.includes(“page-relatorio”)) initRelatorio();
else if (pagina.includes(“page-faturamento”)) initFaturamento();
