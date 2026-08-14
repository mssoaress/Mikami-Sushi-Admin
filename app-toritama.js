// ============================================================
// app-toritama.js — Lógica da filial Toritama
// ============================================================
// Arquivo TOTALMENTE separado do app.js da matriz — nada aqui é
// compartilhado (nem utilitários, nem estado), pra não correr
// risco de um dia um bug de uma filial vazar pra outra.
// Usa suas próprias coleções no Firestore: produtos_toritama,
// comandas_toritama e vendas_toritama.
//
// Organização:
//   1. CARDÁPIO
//   2. UTILITÁRIOS (cópia independente das do app.js)
//   3. SEED (produtos + comandas)
//   4. PÁGINA: COMANDAS (grade)
//   5. PÁGINA: COMANDA (lançar produtos)
//   6. PÁGINA: RELATÓRIO TORITAMA
//   7. INIT
// ============================================================

import {
  db,
  collection, doc,
  getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy,
  serverTimestamp, Timestamp
} from "./firebase.js";

// ============================================================
// 1. CARDÁPIO
// ============================================================
const CARDAPIO_TORITAMA = [
  // Individuais
  { nome: "Temaki de Salmão", categoria: "Individuais", preco: 25.00, ativo: true },
  { nome: "Hot Roll (10 unidades)", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Croquete (6 unidades)", categoria: "Individuais", preco: 15.00, ativo: true },
  { nome: "Uramaki (10 unidades)", categoria: "Individuais", preco: 16.00, ativo: true },
  { nome: "Sushi Dog de Salmão", categoria: "Individuais", preco: 30.00, ativo: true },
  { nome: "Sunomono", categoria: "Individuais", preco: 10.00, ativo: true },
  { nome: "Poke 500ml", categoria: "Individuais", preco: 35.00, ativo: true },
  { nome: "Yakisoba", categoria: "Individuais", preco: 25.00, ativo: true },
  // Combos
  { nome: "Combo 1 — Temaki Salmão + 10 Hot Roll + Coca 200ml", categoria: "Combos", preco: 40.00, ativo: true },
  { nome: "Combo 2 — Mini Sushi Dog + 6 Croquete + Coca 200ml", categoria: "Combos", preco: 30.00, ativo: true },
  { nome: "Combo 3 — 8 Uramaki Kani + 8 Hossomaki Kani + 10 Hot Roll", categoria: "Combos", preco: 45.00, ativo: true },
  { nome: "Combo 4 — 20 Peças Hot Roll Sortidas", categoria: "Combos", preco: 30.00, ativo: true },
  // Bebidas
  { nome: "Água", categoria: "Bebidas", preco: 2.00, ativo: true },
  { nome: "Coca Mini", categoria: "Bebidas", preco: 4.00, ativo: true },
  { nome: "Coca / Antártica Lata", categoria: "Bebidas", preco: 6.00, ativo: true },
  { nome: "H2O", categoria: "Bebidas", preco: 7.00, ativo: true },
];

const TOTAL_COMANDAS = 10;
const SEED_VERSION = `mikami_toritama_seed_v${CARDAPIO_TORITAMA.length}_c${TOTAL_COMANDAS}`;

// ============================================================
// 2. UTILITÁRIOS
// ============================================================
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function fmtMoeda(v) {
  return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtHora(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDataHora(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toast(msg, tipo = "info") {
  const container = document.getElementById("toastContainer") || (() => {
    const c = document.createElement("div");
    c.id = "toastContainer";
    c.className = "toast-container";
    document.body.appendChild(c);
    return c;
  })();
  const el = document.createElement("div");
  el.className = `toast toast--${tipo}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
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

// Botão de filial — cópia independente da mesma função do app.js da
// matriz. Só navegação entre HTMLs, não depende de nada além do DOM.
function initFilialSwitcher() {
  const btn = document.getElementById("btnFilial");
  const modal = document.getElementById("modalFilial");
  if (!btn || !modal) return;

  btn.addEventListener("click", () => modal.classList.add("open"));
  document.getElementById("btnCancelarFilial")?.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
  modal.querySelectorAll(".filial-opcao").forEach(op => {
    op.addEventListener("click", () => {
      if (op.classList.contains("ativa")) { modal.classList.remove("open"); return; }
      window.location.href = op.dataset.href;
    });
  });
}

// ============================================================
// 3. SEED — garante produtos e as 10 comandas no Firestore
// ============================================================
async function garantirProdutosToritama() {
  if (localStorage.getItem(SEED_VERSION + "_prod") === "ok") return;
  try {
    const snap = await getDocs(collection(db, "produtos_toritama"));
    if (snap.size >= CARDAPIO_TORITAMA.length) {
      localStorage.setItem(SEED_VERSION + "_prod", "ok");
      return;
    }
    const existentes = new Set(snap.docs.map(d => d.id));
    await Promise.all(CARDAPIO_TORITAMA.map((p, i) => {
      const id = `prod_${i.toString().padStart(3, "0")}`;
      return existentes.has(id) ? Promise.resolve() : setDoc(doc(db, "produtos_toritama", id), p);
    }));
    localStorage.setItem(SEED_VERSION + "_prod", "ok");
  } catch (err) { console.error("[Toritama] Seed produtos:", err); }
}

async function garantirComandas() {
  if (localStorage.getItem(SEED_VERSION + "_comandas") === "ok") return;
  try {
    const snap = await getDocs(collection(db, "comandas_toritama"));
    const existentes = new Set(snap.docs.map(d => d.id));
    const promises = [];
    for (let i = 1; i <= TOTAL_COMANDAS; i++) {
      const id = `comanda_${i}`;
      if (!existentes.has(id)) {
        promises.push(setDoc(doc(db, "comandas_toritama", id), {
          numero: i, status: "livre", abertaEm: null, total: 0, itens: []
        }));
      }
    }
    if (promises.length) await Promise.all(promises);
    localStorage.setItem(SEED_VERSION + "_comandas", "ok");
  } catch (err) { console.error("[Toritama] Seed comandas:", err); }
}

// ============================================================
// 4. PÁGINA: COMANDAS (grade)
// ============================================================
function _cardComanda(c) {
  const statusLabel = c.status === "ocupada" ? "Ocupada" : "Livre";
  const itensResumo = (c.itens || []).map(it => `${it.qty}x ${it.nome}`).join(" · ");
  return `
    <a href="comanda.html?id=${c.numero}" class="mesa-card ${c.status}">
      <div class="mesa-card-header">
        <div class="mesa-numero">${c.numero}</div>
        <div class="mesa-status-pill status-${c.status}">${statusLabel}</div>
      </div>
      <div class="mesa-card-info">
        <div class="mesa-total">${c.status === "ocupada" ? fmtMoeda(c.total) : "—"}</div>
        <div class="mesa-meta">
          ${c.abertaEm ? `<span>Aberta: ${fmtHora(c.abertaEm)}</span>` : `<span>Comanda livre</span>`}
        </div>
        ${itensResumo ? `<div class="comanda-itens-resumo">${esc(itensResumo)}</div>` : ""}
      </div>
    </a>
  `;
}

async function initComandasGrid() {
  iniciarRelogio();
  initFilialSwitcher();

  await garantirProdutosToritama();
  await garantirComandas();

  const grid = document.getElementById("comandasGrid");
  const statTotal = document.getElementById("statComandasOcupadas");
  if (!grid) return;

  onSnapshot(collection(db, "comandas_toritama"), snap => {
    const comandas = snap.docs.map(d => d.data()).sort((a, b) => a.numero - b.numero);
    grid.innerHTML = comandas.map(_cardComanda).join("");
    if (statTotal) {
      const ocupadas = comandas.filter(c => c.status === "ocupada").length;
      statTotal.textContent = `${ocupadas} / ${comandas.length}`;
    }
  }, err => {
    console.error("[Toritama] Erro ao ler comandas:", err);
    toast("Não foi possível carregar as comandas", "erro");
  });
}

// ============================================================
// 5. PÁGINA: COMANDA (lançar produtos)
// ============================================================
let _comandaId = null;
let _comandaNumero = null;
let _comandaDados = null;
let _produtosToritama = [];
let _categoriaAtiva = "Todas";

function renderCategoriasToritama() {
  const nav = document.getElementById("categoriasTabs");
  if (!nav) return;
  const categorias = ["Todas", ...new Set(_produtosToritama.map(p => p.categoria))];
  nav.innerHTML = categorias.map(cat => `
    <button class="cat-btn${cat === _categoriaAtiva ? " active" : ""}" data-cat="${esc(cat)}">${esc(cat)}</button>
  `).join("");
  nav.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _categoriaAtiva = btn.dataset.cat;
      renderCategoriasToritama();
      renderProdutosToritama();
    });
  });
}

function renderProdutosToritama() {
  const lista = document.getElementById("produtosLista");
  const busca = (document.getElementById("buscaProduto")?.value || "").trim().toLowerCase();
  if (!lista) return;

  const filtrados = _produtosToritama.filter(p => {
    const bateCategoria = _categoriaAtiva === "Todas" || p.categoria === _categoriaAtiva;
    const bateBusca = !busca || p.nome.toLowerCase().includes(busca);
    return bateCategoria && bateBusca;
  });

  lista.innerHTML = filtrados.map(p => `
    <div class="produto-card" data-id="${esc(p.id)}">
      <div class="produto-info">
        <span class="produto-nome">${esc(p.nome)}</span>
        <span class="produto-cat-tag">${esc(p.categoria)}</span>
      </div>
      <span class="produto-preco">${fmtMoeda(p.preco)}</span>
      <button type="button" class="produto-add-btn" data-id="${esc(p.id)}" title="Adicionar à comanda">+</button>
    </div>
  `).join("");

  lista.querySelectorAll(".produto-card").forEach(card => {
    card.addEventListener("click", () => adicionarItemComanda(card.dataset.id));
  });
}

function renderComandaAtual() {
  const lista = document.getElementById("pedidoItens");
  const totalEl = document.getElementById("pedidoTotal");
  const btnFechar = document.getElementById("btnFecharComanda");
  const badge = document.getElementById("pedidoBadge");
  if (!lista || !_comandaDados) return;

  const itens = _comandaDados.itens || [];

  if (badge) {
    badge.textContent = itens.length > 0 ? ` ${itens.length}` : "";
    badge.style.display = itens.length > 0 ? "" : "none";
  }

  lista.innerHTML = itens.length ? itens.map(it => `
    <div class="pedido-item" data-id="${esc(it.produtoId)}">
      <div class="pedido-item-header">
        <span class="pedido-item-nome">${esc(it.nome)}</span>
        <span class="pedido-item-subtotal">${fmtMoeda(it.preco * it.qty)}</span>
      </div>
      <div class="pedido-item-controls">
        <button type="button" class="qty-btn" data-id="${esc(it.produtoId)}" data-delta="-1">−</button>
        <span class="qty-value">${it.qty}</span>
        <button type="button" class="qty-btn" data-id="${esc(it.produtoId)}" data-delta="1">+</button>
        <span style="font-size:0.68rem;color:var(--cinza-texto);margin-left:0.3rem">${fmtMoeda(it.preco)} un.</span>
      </div>
    </div>
  `).join("") : `
    <div class="pedido-vazio">
      <span class="pedido-vazio-icon">🍱</span>
      <p>Nenhum item lançado ainda</p>
    </div>`;

  lista.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => alterarQtdItem(btn.dataset.id, Number(btn.dataset.delta)));
  });

  if (totalEl) totalEl.textContent = fmtMoeda(_comandaDados.total || 0);
  if (btnFechar) btnFechar.disabled = itens.length === 0;

  const numeroEl = document.getElementById("comandaNumeroBadge");
  const statusEl = document.getElementById("comandaStatusBadge");
  if (numeroEl) numeroEl.textContent = `Comanda ${_comandaNumero}`;
  if (statusEl) {
    const ocupada = _comandaDados.status === "ocupada";
    statusEl.textContent = ocupada ? "Ocupada" : "Livre";
    statusEl.classList.toggle("ocupada", ocupada);
  }
}

function _calcularTotal(itens) {
  return itens.reduce((soma, it) => soma + it.preco * it.qty, 0);
}

async function adicionarItemComanda(produtoId) {
  const produto = _produtosToritama.find(p => p.id === produtoId);
  if (!produto || !_comandaDados) return;

  const itens = [...(_comandaDados.itens || [])];
  const existente = itens.find(it => it.produtoId === produtoId);
  if (existente) {
    existente.qty += 1;
  } else {
    itens.push({ produtoId, nome: produto.nome, preco: produto.preco, qty: 1 });
  }

  try {
    await updateDoc(doc(db, "comandas_toritama", _comandaId), {
      itens,
      total: _calcularTotal(itens),
      status: "ocupada",
      abertaEm: _comandaDados.abertaEm || serverTimestamp()
    });
  } catch (err) {
    console.error("[Toritama] Erro ao adicionar item:", err);
    toast("Não foi possível adicionar o item", "erro");
  }
}

async function alterarQtdItem(produtoId, delta) {
  if (!_comandaDados) return;
  let itens = [...(_comandaDados.itens || [])];
  const idx = itens.findIndex(it => it.produtoId === produtoId);
  if (idx === -1) return;

  itens[idx] = { ...itens[idx], qty: itens[idx].qty + delta };
  if (itens[idx].qty <= 0) itens = itens.filter((_, i) => i !== idx);

  try {
    await updateDoc(doc(db, "comandas_toritama", _comandaId), {
      itens,
      total: _calcularTotal(itens)
    });
  } catch (err) {
    console.error("[Toritama] Erro ao alterar quantidade:", err);
    toast("Não foi possível atualizar o item", "erro");
  }
}

function initModalFecharComanda() {
  const modal = document.getElementById("modalFecharComanda");
  const btnAbrir = document.getElementById("btnFecharComanda");
  const btnCancelar = document.getElementById("btnCancelarFecharComanda");
  const btnConfirmar = document.getElementById("btnConfirmarFecharComanda");
  const pagamentoBtns = modal?.querySelectorAll(".pagamento-btn");
  if (!modal || !btnAbrir) return;

  let formaSelecionada = null;

  btnAbrir.addEventListener("click", () => {
    formaSelecionada = null;
    pagamentoBtns.forEach(b => b.classList.remove("selected"));
    document.getElementById("modalFecharTotal").textContent = fmtMoeda(_comandaDados.total || 0);
    modal.classList.add("open");
  });
  btnCancelar.addEventListener("click", () => modal.classList.remove("open"));
  modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });

  pagamentoBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      pagamentoBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      formaSelecionada = btn.dataset.method;
    });
  });

  btnConfirmar.addEventListener("click", async () => {
    if (!formaSelecionada) { toast("Escolha a forma de pagamento", "erro"); return; }
    btnConfirmar.disabled = true;
    try {
      await addDoc(collection(db, "vendas_toritama"), {
        comandaNumero: _comandaNumero,
        itens: _comandaDados.itens || [],
        total: _comandaDados.total || 0,
        formaPagamento: formaSelecionada,
        fechadoEm: serverTimestamp()
      });
      await updateDoc(doc(db, "comandas_toritama", _comandaId), {
        status: "livre", abertaEm: null, total: 0, itens: []
      });
      toast("Comanda fechada com sucesso", "sucesso");
      modal.classList.remove("open");
      setTimeout(() => { window.location.href = "toritama.html"; }, 700);
    } catch (err) {
      console.error("[Toritama] Erro ao fechar comanda:", err);
      toast("Não foi possível fechar a comanda", "erro");
      btnConfirmar.disabled = false;
    }
  });
}

async function initComanda() {
  iniciarRelogio();
  initFilialSwitcher();

  const params = new URLSearchParams(window.location.search);
  _comandaNumero = Number(params.get("id"));
  if (!_comandaNumero || _comandaNumero < 1 || _comandaNumero > TOTAL_COMANDAS) {
    toast("Comanda inválida", "erro");
    setTimeout(() => { window.location.href = "toritama.html"; }, 800);
    return;
  }
  _comandaId = `comanda_${_comandaNumero}`;

  const snapProdutos = await getDocs(collection(db, "produtos_toritama"));
  _produtosToritama = snapProdutos.docs.map(d => ({ id: d.id, ...d.data() }));
  renderCategoriasToritama();
  renderProdutosToritama();

  document.getElementById("buscaProduto")?.addEventListener("input", renderProdutosToritama);

  onSnapshot(doc(db, "comandas_toritama", _comandaId), snap => {
    if (!snap.exists()) return;
    _comandaDados = snap.data();
    renderComandaAtual();
  }, err => {
    console.error("[Toritama] Erro ao ler comanda:", err);
    toast("Não foi possível carregar a comanda", "erro");
  });

  initModalFecharComanda();
}

// ============================================================
// 6. PÁGINA: RELATÓRIO TORITAMA
// ============================================================
// Réplica funcional do relatório da matriz (mesmos gráficos, mesma
// seleção de período, mesma impressão), só que lendo de
// vendas_toritama em vez de vendas — nada é compartilhado.

let unsubRelatorioToritama = null;
let vendasAtuaisToritama = [];
let unsubDespesasToritama = null;
let despesasAtuaisToritama = [];
let _totalVendasPeriodoToritama = 0;

let _periodoTipoT = "dia";
let _periodoRefT = new Date();
let _periodoLabelAtualT = "";

let _autenticadoToritama = false;

async function _sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fazerLoginToritama(senha) {
  const metaEl = document.querySelector('meta[name="report-hash-toritama"]');
  const hashEsperado = metaEl?.content?.trim();
  if (!hashEsperado) {
    console.error("[Toritama] report-hash-toritama não configurado em relatorio-toritama.html");
    return false;
  }
  const hashDigitado = await _sha256(senha);
  if (hashDigitado === hashEsperado) { _autenticadoToritama = true; return true; }
  return false;
}

function fazerLogoutToritama() { _autenticadoToritama = false; window.location.reload(); }

function mostrarTelaLoginToritama() {
  const m = document.getElementById("relatorioMain"); if (!m) return;
  m.innerHTML = `
    <div class="login-box">
      <div class="login-icon">🔐</div>
      <h2>Área Restrita</h2>
      <p>Digite a senha para acessar o Relatório de Toritama.</p>
      <div class="login-campo">
        <input type="password" id="senhaInput" placeholder="Senha" autocomplete="off" />
        <button class="btn-primary btn-login" id="btnLogin">Entrar</button>
      </div>
      <div class="login-erro" id="loginErro"></div>
    </div>`;
  const inp = document.getElementById("senhaInput"), btn = document.getElementById("btnLogin"), err = document.getElementById("loginErro");
  async function t() {
    if (await fazerLoginToritama(inp.value.trim())) { mostrarConteudoRelatorioToritama(); }
    else { err.textContent = "Senha incorreta."; inp.value = ""; inp.focus(); setTimeout(() => { err.textContent = ""; }, 2000); }
  }
  btn.addEventListener("click", t);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") t(); });
  inp.focus();
}

function mostrarConteudoRelatorioToritama() {
  const m = document.getElementById("relatorioMain"), t = document.getElementById("tplRelatorio");
  if (m && t) { m.innerHTML = ""; m.appendChild(t.content.cloneNode(true)); }
  document.getElementById("btnLogout")?.addEventListener("click", fazerLogoutToritama);
  _iniciarConteudoRelatorioToritama();
}

function initRelatorioToritama() {
  iniciarRelogio();
  initFilialSwitcher();
  if (_autenticadoToritama) { mostrarConteudoRelatorioToritama(); } else { mostrarTelaLoginToritama(); }
}

function _dataStrT(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function _inicioDiaT(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function _fimDiaT(d) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

function _calcularRangePeriodoT(tipo, ref) {
  const r = new Date(ref);

  if (tipo === "semana") {
    const inicioSemana = new Date(r); inicioSemana.setDate(r.getDate() - r.getDay());
    const fimSemana = new Date(inicioSemana); fimSemana.setDate(inicioSemana.getDate() + 6);
    const fmt = d => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return { inicio: _inicioDiaT(inicioSemana), fim: _fimDiaT(fimSemana), label: `${fmt(inicioSemana)} – ${fmt(fimSemana)}` };
  }
  if (tipo === "mes") {
    const inicioMes = new Date(r.getFullYear(), r.getMonth(), 1);
    const fimMes = new Date(r.getFullYear(), r.getMonth() + 1, 0);
    const label = inicioMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { inicio: _inicioDiaT(inicioMes), fim: _fimDiaT(fimMes), label: label.charAt(0).toUpperCase() + label.slice(1) };
  }
  if (tipo === "ano") {
    const inicioAno = new Date(r.getFullYear(), 0, 1);
    const fimAno = new Date(r.getFullYear(), 11, 31);
    return { inicio: _inicioDiaT(inicioAno), fim: _fimDiaT(fimAno), label: String(r.getFullYear()) };
  }
  const labelDia = r.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  return { inicio: _inicioDiaT(r), fim: _fimDiaT(r), label: labelDia.replace(".", "").replace(/^\w/, c => c.toUpperCase()) };
}

function _deslocarPeriodoT(tipo, ref, direcao) {
  const r = new Date(ref);
  if (tipo === "semana") r.setDate(r.getDate() + direcao * 7);
  else if (tipo === "mes") r.setMonth(r.getMonth() + direcao);
  else if (tipo === "ano") r.setFullYear(r.getFullYear() + direcao);
  else r.setDate(r.getDate() + direcao);
  return r;
}

function _iniciarConteudoRelatorioToritama() {
  _periodoTipoT = "dia";
  _periodoRefT = new Date();

  const tipoBtns = document.querySelectorAll(".periodo-tipo-btn");
  const nav = document.getElementById("periodoNav");
  const custom = document.getElementById("periodoCustom");
  const iniInput = document.getElementById("customDataIni");
  const fimInput = document.getElementById("customDataFim");

  tipoBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.dataset.tipo;
      if (tipo === _periodoTipoT) return;
      tipoBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      _periodoTipoT = tipo;

      if (tipo === "personalizado") {
        nav?.classList.add("periodo-nav-oculto");
        custom?.classList.add("periodo-custom-ativo");
        const hoje = _dataStrT(new Date());
        if (iniInput && !iniInput.value) iniInput.value = hoje;
        if (fimInput && !fimInput.value) fimInput.value = hoje;
        if (iniInput?.value && fimInput?.value) _aplicarPeriodoCustomT();
      } else {
        nav?.classList.remove("periodo-nav-oculto");
        custom?.classList.remove("periodo-custom-ativo");
        _periodoRefT = new Date();
        _aplicarPeriodoT();
      }
    });
  });

  document.getElementById("btnPeriodoAnterior")?.addEventListener("click", () => {
    _periodoRefT = _deslocarPeriodoT(_periodoTipoT, _periodoRefT, -1);
    _aplicarPeriodoT();
  });
  document.getElementById("btnPeriodoProximo")?.addEventListener("click", () => {
    _periodoRefT = _deslocarPeriodoT(_periodoTipoT, _periodoRefT, 1);
    _aplicarPeriodoT();
  });
  document.getElementById("btnPeriodoHoje")?.addEventListener("click", () => {
    _periodoRefT = new Date();
    _aplicarPeriodoT();
  });
  document.getElementById("btnAplicarCustom")?.addEventListener("click", _aplicarPeriodoCustomT);

  document.getElementById("btnImprimirRelatorio")?.addEventListener("click", () => {
    imprimirRelatorioToritama(_periodoLabelAtualT, vendasAtuaisToritama);
  });

  document.querySelectorAll(".relatorio-view-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".relatorio-view-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      document.getElementById("viewVendas")?.classList.toggle("hidden", view !== "vendas");
      document.getElementById("viewDespesas")?.classList.toggle("hidden", view !== "despesas");
    });
  });

  const despesaDataInput = document.getElementById("despesaData");
  if (despesaDataInput) despesaDataInput.value = _dataStrT(new Date());
  document.getElementById("btnAddDespesa")?.addEventListener("click", criarDespesaToritama);

  _aplicarPeriodoT();
  initFaturamentoToritama();
  window.addEventListener("pagehide", () => {
    if (unsubRelatorioToritama) unsubRelatorioToritama();
    if (unsubDespesasToritama) unsubDespesasToritama();
  }, { once: true });
}

function _aplicarPeriodoCustomT() {
  const ini = document.getElementById("customDataIni")?.value;
  const fim = document.getElementById("customDataFim")?.value;
  if (!ini || !fim) { toast("Selecione as duas datas.", "info"); return; }
  if (ini > fim) { toast("A data inicial deve ser anterior à final.", "erro"); return; }

  const [ai, mi, di] = ini.split("-").map(Number);
  const [af, mf, df] = fim.split("-").map(Number);
  const inicio = _inicioDiaT(new Date(ai, mi - 1, di));
  const fimData = _fimDiaT(new Date(af, mf - 1, df));
  const fmt = s => { const [a, m, d] = s.split("-"); return `${d}/${m}/${a}`; };
  _periodoLabelAtualT = ini === fim ? fmt(ini) : `${fmt(ini)} – ${fmt(fim)}`;

  const labelEl = document.getElementById("periodoLabel");
  if (labelEl) labelEl.textContent = _periodoLabelAtualT;
  escutarVendasToritama(inicio, fimData);
  escutarDespesasToritama(inicio, fimData);
}

function _aplicarPeriodoT() {
  const { inicio, fim, label } = _calcularRangePeriodoT(_periodoTipoT, _periodoRefT);
  _periodoLabelAtualT = label;
  const labelEl = document.getElementById("periodoLabel");
  if (labelEl) labelEl.textContent = label;
  escutarVendasToritama(inicio, fim);
  escutarDespesasToritama(inicio, fim);
}

function escutarVendasToritama(inicio, fim) {
  if (unsubRelatorioToritama) { unsubRelatorioToritama(); unsubRelatorioToritama = null; }

  const q = query(
    collection(db, "vendas_toritama"),
    where("fechadoEm", ">=", Timestamp.fromDate(inicio)),
    where("fechadoEm", "<=", Timestamp.fromDate(fim)),
    orderBy("fechadoEm", "desc")
  );

  const container = document.getElementById("vendasLista");
  if (container) container.innerHTML = `<div class="loading-mesas"><div class="loading-spinner"></div><p>Carregando...</p></div>`;

  unsubRelatorioToritama = onSnapshot(q, snap => {
    const vendas = [];
    snap.forEach(d => vendas.push({ id: d.id, ...d.data() }));
    vendasAtuaisToritama = vendas;
    renderRelatorioToritama(vendas);
  }, err => {
    console.error("[Toritama] Erro ao carregar vendas:", err);
    toast("Erro ao carregar relatório.", "erro");
  });
}

// ── Despesas (Toritama) ──────────────────────────────────────
function escutarDespesasToritama(inicio, fim) {
  if (unsubDespesasToritama) { unsubDespesasToritama(); unsubDespesasToritama = null; }

  const q = query(
    collection(db, "despesas_toritama"),
    where("dataDespesa", ">=", Timestamp.fromDate(inicio)),
    where("dataDespesa", "<=", Timestamp.fromDate(fim)),
    orderBy("dataDespesa", "desc")
  );

  unsubDespesasToritama = onSnapshot(q, snap => {
    const despesas = [];
    snap.forEach(d => despesas.push({ id: d.id, ...d.data() }));
    despesasAtuaisToritama = despesas;
    renderDespesasToritama(despesas);
    atualizarLucroToritama();
  }, err => {
    console.error("[Toritama] Erro ao carregar despesas:", err);
    toast("Erro ao carregar despesas.", "erro");
  });
}

function renderDespesasToritama(despesas) {
  const lista = document.getElementById("despesasLista");
  const count = document.getElementById("despesasHeaderCount");
  if (count) count.textContent = `${despesas.length} ${despesas.length === 1 ? "despesa" : "despesas"}`;
  if (!lista) return;

  if (!despesas.length) {
    lista.innerHTML = `
      <div class="loading-mesas">
        <span style="font-size:2rem">💸</span>
        <p>Nenhuma despesa registrada nesse período.</p>
      </div>`;
    return;
  }

  const porDia = new Map();
  despesas.forEach(d => {
    const data = d.dataDespesa?.toDate ? d.dataDespesa.toDate() : new Date(d.dataDespesa);
    const chave = data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave).push(d);
  });

  lista.innerHTML = Array.from(porDia.entries()).map(([dia, itens]) => {
    const totalDia = itens.reduce((a, d) => a + (d.valor || 0), 0);
    const itensHtml = itens.map(d => `
      <div class="despesa-item" data-id="${d.id}">
        <span class="despesa-item-desc">${esc(d.descricao)}</span>
        <span class="despesa-item-valor">${fmtMoeda(d.valor)}</span>
        <button class="despesa-item-del" data-id="${d.id}" title="Excluir despesa">🗑</button>
      </div>
    `).join("");
    return `
      <div class="despesa-dia-grupo">
        <div class="despesa-dia-titulo"><span>${esc(dia.replace(".", ""))}</span><span>${fmtMoeda(totalDia)}</span></div>
        ${itensHtml}
      </div>
    `;
  }).join("");

  lista.querySelectorAll(".despesa-item-del").forEach(btn => {
    btn.addEventListener("click", () => excluirDespesaToritama(btn.dataset.id));
  });
}

async function criarDespesaToritama() {
  const descInput = document.getElementById("despesaDescricao");
  const valorInput = document.getElementById("despesaValor");
  const dataInput = document.getElementById("despesaData");

  const descricao = descInput?.value.trim();
  const valor = parseFloat(valorInput?.value);
  const dataStr = dataInput?.value;

  if (!descricao) { toast("Descreva a despesa.", "info"); return; }
  if (!valor || valor <= 0) { toast("Informe um valor válido.", "info"); return; }
  if (!dataStr) { toast("Escolha a data da despesa.", "info"); return; }

  const [a, m, d] = dataStr.split("-").map(Number);
  const dataDespesa = _inicioDiaT(new Date(a, m - 1, d));

  try {
    await addDoc(collection(db, "despesas_toritama"), {
      descricao, valor, dataDespesa: Timestamp.fromDate(dataDespesa), criadoEm: serverTimestamp()
    });
    toast("Despesa adicionada.", "sucesso");
    descInput.value = "";
    valorInput.value = "";
  } catch (err) {
    console.error("[Toritama] Erro ao adicionar despesa:", err);
    toast("Erro ao adicionar despesa.", "erro");
  }
}

async function excluirDespesaToritama(despesaId) {
  const confirmado = await _confirmarAcaoT("Excluir esta despesa? Esta ação não pode ser desfeita.");
  if (!confirmado) return;
  try {
    await deleteDoc(doc(db, "despesas_toritama", despesaId));
    toast("Despesa excluída.", "sucesso");
  } catch (err) {
    console.error("[Toritama] Erro ao excluir despesa:", err);
    toast("Erro ao excluir despesa.", "erro");
  }
}

function atualizarLucroToritama() {
  const totalDespesas = despesasAtuaisToritama.reduce((a, d) => a + (d.valor || 0), 0);
  const lucro = _totalVendasPeriodoToritama - totalDespesas;
  const elD = document.getElementById("resumoDespesas");
  const elL = document.getElementById("resumoLucro");
  if (elD) elD.textContent = fmtMoeda(totalDespesas);
  if (elL) {
    elL.textContent = fmtMoeda(lucro);
    elL.style.color = lucro < 0 ? "var(--vermelho-vivo)" : "";
  }
}

function renderRelatorioToritama(vendas) {
  const totalDia = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdComandas = vendas.length;
  const ticketMed = qtdComandas > 0 ? totalDia / qtdComandas : 0;
  _totalVendasPeriodoToritama = totalDia;
  atualizarLucroToritama();

  const el = id => document.getElementById(id);
  if (el("resumoTotal")) el("resumoTotal").textContent = fmtMoeda(totalDia);
  if (el("resumoMesas")) el("resumoMesas").textContent = qtdComandas;
  if (el("resumoTicket")) el("resumoTicket").textContent = fmtMoeda(ticketMed);

  const porPag = {};
  vendas.forEach(v => { const met = v.formaPagamento || "Outros"; porPag[met] = (porPag[met] || 0) + (v.total || 0); });
  const pagWrap = el("pagamentosDetalheWrap");
  const breakdown = el("pagamentosBreakdown");
  const temPagamentos = Object.keys(porPag).length > 0;
  if (pagWrap) pagWrap.style.display = temPagamentos ? "" : "none";
  if (breakdown) {
    breakdown.innerHTML = temPagamentos
      ? Object.entries(porPag).map(([met, val]) => `
        <div class="pag-linha">
          <span class="pag-metodo">${esc(met)}</span>
          <span class="pag-valor">${fmtMoeda(val)}</span>
        </div>`).join("")
      : "";
  }

  const headerLabel = el("vendasHeaderLabel");
  if (headerLabel) headerLabel.textContent = `Vendas — ${_periodoLabelAtualT}`;
  const headerCount = el("vendasHeaderCount");
  if (headerCount) headerCount.textContent = `${qtdComandas} ${qtdComandas === 1 ? "venda" : "vendas"}`;

  const container = el("vendasLista");
  if (!container) return;

  if (!vendas.length) {
    container.innerHTML = `
      <div class="loading-mesas">
        <span style="font-size:2rem">📋</span>
        <p>Nenhuma venda registrada nessa data.</p>
      </div>`;
    _renderGraficoItensDiaToritama([]);
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
          <span class="venda-mesa">Comanda ${esc(String(venda.comandaNumero))}</span>
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
    btn.addEventListener("click", () => excluirVendaToritama(btn.dataset.vendaId));
  });

  _renderGraficoItensDiaToritama(vendas);
}

function _renderGraficoItensDiaToritama(vendas) {
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

  const cores = labels.map((_, i) => {
    const t = labels.length <= 1 ? 0 : i / (labels.length - 1);
    const r = Math.round(192 + (212 - 192) * t);
    const g = Math.round(57 + (160 - 57) * t);
    const b = Math.round(43 + (23 - 43) * t);
    return `rgba(${r},${g},${b},0.85)`;
  });

  _renderGraficoT("chartItensDia", "bar", labels, values, "Qtd pedida");

  if (_chartInstancesT["chartItensDia"]) {
    _chartInstancesT["chartItensDia"].data.datasets[0].backgroundColor = cores;
    _chartInstancesT["chartItensDia"].data.datasets[0].borderColor = cores.map(c => c.replace("0.85", "1"));
    _chartInstancesT["chartItensDia"].update();
  }

  const lista = document.getElementById("chartItensDiaLista");
  if (lista) {
    lista.innerHTML = sorted.map(([nome, qty], i) => {
      const pct = total > 0 ? Math.round((qty / total) * 100) : 0;
      return `
        <div class="cid-linha">
          <span class="cid-pos">${i + 1}</span>
          <span class="cid-nome">${esc(nome)}</span>
          <div class="cid-bar-wrap"><div class="cid-bar" style="width:${pct}%;background:${cores[i]}"></div></div>
          <span class="cid-qty">${qty}x</span>
          <span class="cid-pct">${pct}%</span>
        </div>
      `;
    }).join("");
  }
}

async function excluirVendaToritama(vendaId) {
  const confirmado = await _confirmarAcaoT("Excluir este registro de venda? Esta ação não pode ser desfeita.");
  if (!confirmado) return;
  try {
    await deleteDoc(doc(db, "vendas_toritama", vendaId));
    toast("Registro excluído.", "sucesso");
  } catch (err) {
    console.error("[Toritama] Erro ao excluir venda:", err);
    toast("Erro ao excluir registro.", "erro");
  }
}

function _confirmarAcaoT(mensagem) {
  return new Promise(resolve => {
    let overlay = document.getElementById("_modalConfirmT");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "_modalConfirmT";
      overlay.className = "modal-overlay";
      overlay.innerHTML = `
        <div class="modal-box" style="max-width:380px;border-radius:var(--raio-lg)">
          <p id="_modalConfirmMsgT" style="font-size:0.9rem;color:var(--branco);margin-bottom:1.25rem;line-height:1.5"></p>
          <div class="modal-acoes">
            <button class="btn-secondary" id="_modalConfirmNaoT">Cancelar</button>
            <button class="btn-primary" id="_modalConfirmSimT">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById("_modalConfirmMsgT").textContent = mensagem;
    overlay.classList.add("open");
    const fechar = (res) => { overlay.classList.remove("open"); resolve(res); };
    document.getElementById("_modalConfirmSimT").onclick = () => fechar(true);
    document.getElementById("_modalConfirmNaoT").onclick = () => fechar(false);
    overlay.onclick = (e) => { if (e.target === overlay) fechar(false); };
  });
}

function imprimirRelatorioToritama(labelPeriodo, vendas) {
  if (!vendas || !vendas.length) { toast("Nenhuma venda para imprimir.", "info"); return; }

  const totalDia = vendas.reduce((acc, v) => acc + (v.total || 0), 0);
  const qtdComandas = vendas.length;
  const ticketMed = qtdComandas > 0 ? totalDia / qtdComandas : 0;

  const porPag = {};
  vendas.forEach(v => { const met = v.formaPagamento || "Outros"; porPag[met] = (porPag[met] || 0) + (v.total || 0); });

  const pagamentosHtml = Object.entries(porPag).map(([met, val]) => `
    <div class="print-relatorio-resumo-linha"><span>${esc(met)}</span><span>${fmtMoeda(val)}</span></div>
  `).join("");

  const vendasHtml = vendas.map(venda => {
    const itensAgrupados = [];
    (venda.itens || []).forEach(item => {
      const ex = itensAgrupados.find(i => i.nome === item.nome);
      if (ex) { ex.qty += item.qty; ex.subtotal += item.preco * item.qty; }
      else itensAgrupados.push({ nome: item.nome, qty: item.qty, preco: item.preco, subtotal: item.preco * item.qty });
    });
    const itensHtml = itensAgrupados.map(item => `
      <div class="print-item"><span>${item.qty}x ${esc(item.nome)}</span><span>${fmtMoeda(item.subtotal)}</span></div>
    `).join("");
    return `
      <div class="print-relatorio-venda">
        <div class="print-relatorio-venda-header">
          <span>Comanda ${esc(String(venda.comandaNumero))}</span>
          <span>${fmtDataHora(venda.fechadoEm)}</span>
          <span>${esc(venda.formaPagamento || "—")}</span>
          <span>${fmtMoeda(venda.total || 0)}</span>
        </div>
        ${itensHtml}
      </div>
    `;
  }).join("");

  const printArea = document.getElementById("printArea");
  if (!printArea) { toast("Área de impressão não encontrada.", "erro"); return; }

  printArea.innerHTML = `
    <div class="print-relatorio-titulo">MIKAMI SUSHI — TORITAMA</div>
    <div class="print-relatorio-data">Relatório — ${esc(labelPeriodo)}</div>
    <div class="print-relatorio-data">Impresso em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="print-relatorio-resumo">
      <div class="print-relatorio-resumo-linha"><span>Total do período</span><span><strong>${fmtMoeda(totalDia)}</strong></span></div>
      <div class="print-relatorio-resumo-linha"><span>Comandas fechadas</span><span>${qtdComandas}</span></div>
      <div class="print-relatorio-resumo-linha"><span>Ticket médio</span><span>${fmtMoeda(ticketMed)}</span></div>
      <hr style="border:none;border-top:1px dashed #000;margin:4px 0"/>
      ${pagamentosHtml}
    </div>
    <div class="print-section-title">Detalhe por Comanda</div>
    ${vendasHtml}
    <div class="print-footer">Mikami Sushi Toritama — Sistema de Gestão</div>
  `;
  window.print();
}

function initFaturamentoToritama() {
  const agora = new Date();
  const inicioAno = new Date(agora.getFullYear() - 1, agora.getMonth() + 1, 1);
  inicioAno.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, "vendas_toritama"),
    where("fechadoEm", ">=", Timestamp.fromDate(inicioAno)),
    orderBy("fechadoEm", "asc")
  );

  onSnapshot(q, snap => {
    const vendas = [];
    snap.forEach(d => vendas.push({ id: d.id, ...d.data() }));
    renderFaturamentoToritama(vendas);
  });
}

function renderFaturamentoToritama(vendas) {
  const agora = new Date();

  const porData = new Map();
  const porMes = new Map();
  vendas.forEach(v => {
    if (!v.fechadoEm) return;
    const vd = v.fechadoEm.toDate ? v.fechadoEm.toDate() : new Date(v.fechadoEm);
    const dataKey = vd.toDateString();
    const mesKey = `${vd.getFullYear()}-${vd.getMonth()}`;
    porData.set(dataKey, (porData.get(dataKey) || 0) + (v.total || 0));
    porMes.set(mesKey, (porMes.get(mesKey) || 0) + (v.total || 0));
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

  _renderGraficoT("chartSemanal", "bar", diasSemana, totalSemana, "Faturamento Diário (7 dias)");
  _renderGraficoT("chartMensal", "bar", diasMes, totalMes, "Faturamento Diário (30 dias)");
  _renderGraficoT("chartAnual", "bar", mesesLabel, totalAnual, "Faturamento Mensal (12 meses)");
  _renderGraficoT("chartPagamento", "doughnut", pagLabels, pagValues, "Por Forma de Pagamento");
}

const _chartInstancesT = {};
function _renderGraficoT(canvasId, tipo, labels, data, titulo) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (_chartInstancesT[canvasId]) { _chartInstancesT[canvasId].destroy(); }

  const cores = [
    "rgba(192,57,43,0.85)", "rgba(212,160,23,0.85)", "rgba(39,174,96,0.85)",
    "rgba(41,128,185,0.85)", "rgba(142,68,173,0.85)",
  ];
  const isBarra = tipo === "bar";

  _chartInstancesT[canvasId] = new Chart(canvas, {
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

if (pagina.includes("page-toritama")) initComandasGrid();
else if (pagina.includes("page-comanda")) initComanda();
else if (pagina.includes("page-relatorio-toritama")) initRelatorioToritama();
