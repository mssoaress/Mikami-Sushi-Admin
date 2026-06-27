# 🍣 Mikami Sushi — Sistema de Gestão

Sistema web completo para gestão de mesas, pedidos e relatórios de um restaurante de sushi. Desenvolvido com HTML, CSS e JavaScript puro, utilizando Firebase como banco de dados em tempo real.

---

## 📋 Visão Geral

O Mikami Sushi é uma PWA (Progressive Web App) multi-tela que permite gerenciar todo o fluxo do restaurante: desde a abertura de uma mesa até o fechamento com emissão de relatórios. O sistema funciona em tempo real, sincronizando automaticamente entre múltiplos dispositivos via Firestore.

---

## 🗂️ Estrutura de Arquivos

```
mikami-sushi/
├── index.html        # Página principal — visão geral das mesas
├── mesa.html         # Página de controle individual de uma mesa
├── cozinha.html      # Painel da cozinha — pedidos ativos em tempo real
├── relatorio.html    # Relatórios, gráficos e faturamento histórico
├── app.js            # Lógica completa da aplicação (módulo ES6)
├── firebase.js       # Configuração e exports do Firebase
├── style.css         # Estilos globais da aplicação
├── firebase.json     # Configuração de hosting do Firebase
└── img/
    └── logo123.jpg   # Logo do restaurante
```

---

## ⚙️ Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES6 (módulos) |
| Banco de dados | Firebase Firestore (tempo real) |
| Hospedagem | Firebase Hosting |
| Gráficos | Chart.js 4.4.1 |
| Tipografia | Google Fonts — Inter + Space Grotesk |
| Auth | Senha manual (relatório protegido) |

---

## 🖥️ Páginas e Funcionalidades

### 1. `index.html` — Mesas

Visão geral de todas as mesas do restaurante.

- Grid de cards com status em tempo real (Livre / Ocupada / Aguardando Pagamento)
- Barra de estatísticas: mesas livres, ocupadas e aguardando
- Adicionar novas mesas dinamicamente (tipo: Restaurante ou Delivery)
- Clique em qualquer mesa para abrir o painel de controle da mesa
- Relógio em tempo real no cabeçalho

### 2. `mesa.html` — Controle da Mesa

Painel principal de atendimento, acessado via `mesa.html?mesa=<número>`.

Organizado em três colunas (ou abas no mobile):

**Cardápio**
- Listagem completa de produtos por categoria
- Busca por nome (atalho de teclado `/`)
- Filtro por categorias: Combos, Individuais, Especiais, Temakis, Yakisoba, Doces, Bebidas
- Adicionais configuráveis (Camarão, Kani, Cream Cheese, etc.)

**Pedido Atual**
- Carrinho com ajuste de quantidade e remoção de itens
- Drawer de adicionais rápidos
- Total em tempo real
- Botão de confirmação envia o pedido para o Firestore

**Conta da Mesa**
- Histórico de todos os pedidos confirmados
- Edição de pedidos já confirmados
- Impressão para cozinha (via `window.print()`)
- Impressão de pré-conta para o cliente
- Fechamento de mesa com seleção de forma de pagamento

**Fechamento de Mesa**
- Pagamento único: Pix, Dinheiro, Débito ou Crédito
- Pagamento dividido: múltiplos métodos com valores parciais
- Valida se a soma dos parciais cobre o total antes de confirmar
- Ao fechar: registra venda na coleção `vendas` e reseta a mesa

**Delivery**
- Aba exclusiva para mesas do tipo delivery
- Seleção de local de entrega com taxa configurada por bairro
- Cálculo automático do total com taxa inclusa

### 3. `cozinha.html` — Painel da Cozinha

Monitor em tempo real de todos os pedidos ativos do restaurante.

- Atualização automática via `onSnapshot`
- Filtro por status: Novo / Em preparo / Pronto / Entregue
- Contador de pedidos ativos
- Progressão de status com um clique: Novo → Em preparo → Pronto → Entregue
- Edição de itens de um pedido diretamente da cozinha
- Timer mostrando há quanto tempo cada pedido foi feito
- Alerta sonoro / visual para novos pedidos

### 4. `relatorio.html` — Relatório e Faturamento

Acesso protegido por senha (configurável no código).

**Relatório do Dia**
- Filtro por data com atalhos: Hoje, Ontem, Anteontem, Últimos 7 dias
- Total do dia, mesas fechadas e ticket médio
- Breakdown por forma de pagamento
- Detalhe de cada mesa fechada com itens e valores
- Gráfico de produtos mais vendidos no dia
- Impressão do relatório diário

**Faturamento Histórico**
- Cards de totais: Hoje / 7 dias / 30 dias / 12 meses
- Gráfico de barras — últimos 7 dias
- Gráfico de barras — últimos 30 dias
- Gráfico de barras — últimos 12 meses
- Gráfico de rosca — faturamento por forma de pagamento

---

## 🗃️ Estrutura do Banco de Dados (Firestore)

### Coleção `mesas`

```
mesas/{mesa_N}
├── numero: number          // Número identificador da mesa
├── tipo: string            // "restaurante" | "delivery"
├── status: string          // "livre" | "ocupada" | "aguardando"
├── abertaEm: Timestamp     // Horário de abertura
├── total: number           // Total acumulado (calculado)
├── pedidosCount: number    // Quantidade de pedidos confirmados
├── historicoPedidos: []    // Array de pedidos confirmados
└── entrega: {              // Somente delivery
    local: string,
    taxa: number
}
```

### Coleção `pedidos`

```
pedidos/{pedidoId}
├── mesaId: string          // Referência à mesa
├── mesaNumero: number
├── itens: [{               // Array de itens do pedido
    nome: string,
    preco: number,
    qty: number,
    adicionais: string[]
}]
├── total: number
├── status: string          // "Novo" | "Em preparo" | "Pronto" | "Entregue"
└── criadoEm: Timestamp
```

### Coleção `produtos`

```
produtos/{prod_NNN}
├── nome: string
├── categoria: string
├── preco: number
└── ativo: boolean
```

### Coleção `vendas`

```
vendas/{vendaId}
├── mesaNumero: number
├── tipo: string
├── itens: []               // Snapshot dos itens no momento do fechamento
├── total: number
├── formaPagamento: string  // Ex: "Pix" ou "Pix (R$30,00) + Dinheiro (R$20,00)"
├── taxaEntrega: number
└── fechadoEm: Timestamp
```

---

## 🧩 Cardápio Padrão

O cardápio é definido diretamente em `app.js` e é automaticamente sincronizado no Firestore no primeiro acesso. Categorias disponíveis:

- **Combos** — 5 opções de R$ 32,00 a R$ 46,00
- **Individuais** — Hot Rolls, Uramakis, Hosomakis, Hot Dogs, etc.
- **Especiais** — Uramaki Kani com Camarão, Mikami Supremo 500g, etc.
- **Temakis** — Salmão, Kani, Skin, Camarão (R$ 21,00 a R$ 30,00)
- **Yakisoba** — Individual e para 2 pessoas
- **Doces** — Harumaki com Nutella e variações
- **Bebidas** — Coca-Cola, Fanta, Kuat, Água (R$ 3,00 a R$ 6,00)

---

## 🚀 Como Implantar

### Pré-requisitos

- Conta no [Firebase](https://firebase.google.com)
- Node.js instalado (para o Firebase CLI)
- Firebase CLI: `npm install -g firebase-tools`

### Passo a Passo

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd mikami-sushi

# 2. Faça login no Firebase
firebase login

# 3. Selecione o projeto
firebase use mikami-sushi

# 4. Faça o deploy
firebase deploy --only hosting
```

### Configuração do Firebase

As credenciais já estão em `firebase.js`. Para usar em um projeto próprio, substitua o objeto `firebaseConfig` pelas credenciais do seu projeto no [Console do Firebase](https://console.firebase.google.com).

```javascript
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO",
  storageBucket:     "SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID"
};
```

### Regras do Firestore

Configure as regras no Console do Firebase para permitir leitura e escrita autenticadas. Para uso interno (sem autenticação de usuário):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Apenas para uso interno/local
    }
  }
}
```

> ⚠️ Para produção com acesso público, implemente autenticação via Firebase Auth.

---

## 📱 Suporte Mobile

O sistema é responsivo e otimizado para tablets e smartphones:

- Layout de abas no mobile para a página de mesa (Cardápio / Pedido / Conta)
- Bottom navigation bar em todas as páginas
- Meta tags para PWA (apple-mobile-web-app-capable)
- Theme color configurado para dark mode
- viewport-fit=cover para telas com notch

---

## 🔧 Customização

### Alterar número fixo de mesas

Em `app.js`, linha `const TOTAL_MESAS = 12`, altere o valor desejado. O seed será recriado automaticamente.

### Adicionar produto ao cardápio

Adicione um objeto ao array `CARDAPIO` em `app.js`:

```javascript
{ nome: "Novo Produto", categoria: "Individuais", preco: 20.00, ativo: true }
```

Na próxima carga, o seed detectará a diferença e adicionará o produto ao Firestore.

### Adicionar local de entrega

Em `app.js`, adicione ao array `LOCAIS_ENTREGA`:

```javascript
{ nome: "Novo Bairro", taxa: 8, icone: "📍" }
```

### Alterar adicionais disponíveis

Em `app.js`, edite o array `ADICIONAIS`:

```javascript
const ADICIONAIS = ["Camarão", "Kani", "Cream Cheese", ...];
```

---

## 🔄 Fluxo de Atendimento

```
1. Abertura          → Garçom clica na mesa em index.html
2. Pedido            → Seleciona itens no cardápio → Confirma pedido
3. Cozinha           → Cozinha visualiza em cozinha.html → Atualiza status
4. Entrega           → Status: Pronto → Entregue
5. Fechamento        → Garçom acessa Conta → Fechar Mesa → Escolhe pagamento
6. Relatório         → Venda registrada automaticamente em relatorio.html
```

---

## 📄 Licença

Projeto desenvolvido para uso interno do **Mikami Sushi**. Todos os direitos reservados.