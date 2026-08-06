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
        <span class="pedido-item-subtotal">${fmtMoeda(it.preco * it.qtd)}</span>
      </div>
      <div class="pedido-item-controls">
        <button type="button" class="qty-btn" data-id="${esc(it.produtoId)}" data-delta="-1">−</button>
        <span class="qty-value">${it.qtd}</span>
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
  return itens.reduce((soma, it) => soma + it.preco * it.qtd, 0);
}

async function adicionarItemComanda(produtoId) {
  const produto = _produtosToritama.find(p => p.id === produtoId);
  if (!produto || !_comandaDados) return;

  const itens = [...(_comandaDados.itens || [])];
  const existente = itens.find(it => it.produtoId === produtoId);
  if (existente) {
    existente.qtd += 1;
  } else {
    itens.push({ produtoId, nome: produto.nome, preco: produto.preco, qtd: 1 });
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

  itens[idx] = { ...itens[idx], qtd: itens[idx].qtd + delta };
  if (itens[idx].qtd <= 0) itens = itens.filter((_, i) => i !== idx);

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
        fechadaEm: serverTimestamp()
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
async function _sha256(texto) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function _inicioDoDia(diasAtras = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diasAtras);
  return d;
}

async function _somaVendasDesde(desde) {
  const q = query(
    collection(db, "vendas_toritama"),
    where("fechadaEm", ">=", Timestamp.fromDate(desde))
  );
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach(d => { total += d.data().total || 0; });
  return { total, count: snap.size };
}

async function carregarResumoToritama() {
  const hoje = await _somaVendasDesde(_inicioDoDia(0));
  const semana = await _somaVendasDesde(_inicioDoDia(6));
  const mes = await _somaVendasDesde(_inicioDoDia(29));

  document.getElementById("resHojeValor").textContent = fmtMoeda(hoje.total);
  document.getElementById("resHojeCount").textContent = `${hoje.count} venda(s)`;
  document.getElementById("resSemanaValor").textContent = fmtMoeda(semana.total);
  document.getElementById("resSemanaCount").textContent = `${semana.count} venda(s)`;
  document.getElementById("resMesValor").textContent = fmtMoeda(mes.total);
  document.getElementById("resMesCount").textContent = `${mes.count} venda(s)`;
}

function _cardVendaToritama(id, v) {
  return `
    <div class="venda-card" data-id="${id}">
      <div class="venda-card-header">
        <span class="venda-mesa">Comanda ${v.comandaNumero}</span>
        <span class="venda-hora">${fmtDataHora(v.fechadaEm)}</span>
        <span class="venda-pagamento">${esc(v.formaPagamento)}</span>
        <span class="venda-total-valor">${fmtMoeda(v.total)}</span>
      </div>
      <div class="venda-itens-lista">
        ${(v.itens || []).map(it => `
          <div class="venda-item-linha">
            <span class="venda-item-nome">${esc(it.nome)}</span>
            <span class="venda-item-qty">${it.qtd}x</span>
            <span class="venda-item-val">${fmtMoeda(it.preco * it.qtd)}</span>
          </div>
        `).join("")}
      </div>
      <button type="button" class="btn-excluir-venda" data-id="${id}" style="margin-top:0.6rem">Excluir</button>
    </div>
  `;
}

async function carregarListaVendasToritama() {
  const lista = document.getElementById("listaVendasToritama");
  if (!lista) return;
  lista.innerHTML = `<p class="conta-vazia">Carregando…</p>`;

  const q = query(collection(db, "vendas_toritama"), orderBy("fechadaEm", "desc"));
  const snap = await getDocs(q);

  if (snap.empty) {
    lista.innerHTML = `<p class="conta-vazia">Nenhuma venda registrada ainda.</p>`;
    return;
  }

  lista.innerHTML = snap.docs.map(d => _cardVendaToritama(d.id, d.data())).join("");

  lista.querySelectorAll(".btn-excluir-venda").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir esta venda do relatório? Essa ação não pode ser desfeita.")) return;
      try {
        await deleteDoc(doc(db, "vendas_toritama", btn.dataset.id));
        toast("Venda excluída", "info");
        carregarResumoToritama();
        carregarListaVendasToritama();
      } catch (err) {
        console.error("[Toritama] Erro ao excluir venda:", err);
        toast("Não foi possível excluir", "erro");
      }
    });
  });
}

function mostrarConteudoRelatorioToritama() {
  document.getElementById("relatorioLoginToritama")?.classList.add("hidden");
  document.getElementById("relatorioConteudoToritama")?.classList.remove("hidden");
  carregarResumoToritama();
  carregarListaVendasToritama();
}

// Autenticação por hash SHA-256, igual ao relatório da matriz: a senha
// não fica no JS. Configure em relatorio-toritama.html:
//   <meta name="report-hash-toritama" content="SEU_HASH_SHA256_AQUI">
// Gerar o hash (Node.js):
//   require('crypto').createHash('sha256').update('suasenha').digest('hex')
let _autenticadoToritama = false;

async function _fazerLoginToritama(senha) {
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

function initRelatorioToritama() {
  iniciarRelogio();
  initFilialSwitcher();

  if (_autenticadoToritama) { mostrarConteudoRelatorioToritama(); }

  const form = document.getElementById("formLoginRelatorioToritama");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const inp = document.getElementById("senhaRelatorioToritama");
    const err = document.getElementById("loginErroToritama");
    if (await _fazerLoginToritama(inp.value.trim())) {
      mostrarConteudoRelatorioToritama();
    } else {
      if (err) { err.textContent = "Senha incorreta."; setTimeout(() => { err.textContent = ""; }, 2000); }
      inp.value = "";
      inp.focus();
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
