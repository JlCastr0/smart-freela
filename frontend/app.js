/**
 * SMART FREELA — WEB3.JS APPLICATION (FRONTEND)
 * Conexão com MetaMask, verificação de rede Sepolia, chamadas .call e .send,
 * escuta de eventos e tratamento de erros.
 */

const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx/";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Nomes legíveis e classes de estilo para os estados do enum ProjectStatus
const STATUS_NAMES = [
  "Aberto",        // 0: Open
  "Em Andamento",  // 1: InProgress
  "Entregue",      // 2: Delivered
  "Finalizado",    // 3: Completed
  "Cancelado",     // 4: Canceled
  "Em Disputa"     // 5: InDispute
];

// Application State
let web3 = null;
let contract = null;
let connectedAccount = null;
let contractOwner = null;
let isContractActive = true;
let isSepoliaOk = false;
let loadedProjects = [];
let currentFilter = "all";
let modalProjectId = null;

const $ = (id) => document.getElementById(id);

window.addEventListener("DOMContentLoaded", async () => {
  setupButtons();
  setupFilters();
  checkContractConfig();

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      await initAccount(accounts[0]);
    }
    window.ethereum.on("accountsChanged", handleAccountChange);
    window.ethereum.on("chainChanged", () => window.location.reload());
  } else {
    showStatus("MetaMask não encontrada. Por favor, instale a extensão MetaMask.", "bad");
  }
});

function checkContractConfig() {
  if (typeof CONTRACT_ADDRESS === "undefined" || !CONTRACT_ADDRESS || CONTRACT_ADDRESS.includes("COLOQUE_O_ENDERECO")) {
    $("contractWarning").hidden = false;
  } else {
    $("contractWarning").hidden = true;
  }
}

function setupButtons() {
  $("connectBtn").onclick = connectWallet;
  $("btnCreateProject").onclick = createNewProject;
  $("btnWithdrawFees").onclick = withdrawPlatformFees;
  $("btnToggleContract").onclick = toggleContractStatus;
  $("btnRefresh").onclick = loadAllData;
  $("btnConfirmDelivery").onclick = submitDelivery;
  $("btnConfirmResolution").onclick = executeDisputeResolution;
}

function setupFilters() {
  const tabs = document.querySelectorAll(".filter-tabs .tab");
  tabs.forEach((tab) => {
    tab.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderProjects();
    };
  });
}

async function connectWallet() {
  if (!window.ethereum) {
    await showAlertModal("MetaMask não detectada. Instale a extensão no seu navegador.", "MetaMask Ausente");
    return;
  }
  try {
    showStatus("Solicitando autorização na MetaMask...", "pending");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (accounts.length === 0) {
      showStatus("Nenhuma conta selecionada.", "bad");
      return;
    }
    await initAccount(accounts[0]);
  } catch (err) {
    handleError(err, "Falha ao conectar MetaMask");
  }
}

async function initAccount(account) {
  connectedAccount = account;
  web3 = new Web3(window.ethereum);
  await checkAndSwitchToSepolia();
  if (!isSepoliaOk) {
    updateNetworkUI(false);
    return;
  }
  updateNetworkUI(true);
  await loadBalance();

  if ($("contractWarning").hidden) {
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    try {
      contractOwner = await contract.methods.owner().call();
      checkAdminPanel();
    } catch (e) {
      console.warn("Não foi possível carregar dono do contrato:", e);
    }
    await loadAllData();
  }
}

async function checkAndSwitchToSepolia() {
  try {
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const chainIdDec = BigInt(chainIdHex);
    if (chainIdDec === SEPOLIA_CHAIN_ID_DEC) {
      isSepoliaOk = true;
      return true;
    }
    showStatus("Solicitando mudança para a rede Ethereum Sepolia...", "pending");
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
    isSepoliaOk = true;
    return true;
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_CHAIN_ID_HEX,
            chainName: "Sepolia Testnet",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
        isSepoliaOk = true;
        return true;
      } catch (addError) {
        handleError(addError, "Erro ao adicionar rede Sepolia");
      }
    } else {
      handleError(switchError, "Rede incorreta. Conecte-se à Ethereum Sepolia");
    }
    isSepoliaOk = false;
    return false;
  }
}

function updateNetworkUI(isConnected) {
  const dot = $("networkDot");
  const netText = $("networkText");
  const walletAcc = $("walletAccount");
  const btn = $("connectBtn");
  const repBadge = $("walletReputation");

  if (isConnected && isSepoliaOk && connectedAccount) {
    dot.className = "dot ok";
    netText.textContent = "Sepolia Conectada";
    walletAcc.textContent = `${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)}`;
    btn.textContent = "Conectado";
    btn.disabled = true;
    showStatus("Conectado com sucesso à Ethereum Sepolia.", "good", 3000);
  } else if (connectedAccount && !isSepoliaOk) {
    dot.className = "dot warn";
    netText.textContent = "Rede Incorreta";
    walletAcc.textContent = "Mude para Sepolia na MetaMask";
    btn.textContent = "Trocar Rede";
    btn.disabled = false;
    btn.onclick = checkAndSwitchToSepolia;
    if (repBadge) repBadge.hidden = true;
  } else {
    dot.className = "dot";
    netText.textContent = "MetaMask Desconectada";
    walletAcc.textContent = "Clique para conectar";
    btn.textContent = "Conectar MetaMask";
    btn.disabled = false;
    btn.onclick = connectWallet;
    if (repBadge) repBadge.hidden = true;
  }
}

async function loadBalance() {
  if (!web3 || !connectedAccount) return;
  try {
    const balanceWei = await web3.eth.getBalance(connectedAccount);
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, "ether")).toFixed(4);
    $("walletBalance").textContent = `${balanceEth} ETH`;
  } catch (e) {
    console.error("Erro ao carregar saldo:", e);
  }
}

async function loadUserReputation() {
  const repBadge = $("walletReputation");
  if (!contract || !connectedAccount || !repBadge) return;
  try {
    const rep = await contract.methods.getUserReputation(connectedAccount).call();
    repBadge.textContent = `⭐ Reputação: ${rep} pts`;
    repBadge.hidden = false;
  } catch (e) {
    console.warn("Não foi possível carregar reputação:", e);
  }
}

function checkAdminPanel() {
  if (contractOwner && connectedAccount && contractOwner.toLowerCase() === connectedAccount.toLowerCase()) {
    $("cardAdmin").hidden = false;
  } else {
    $("cardAdmin").hidden = true;
  }
}

async function handleAccountChange(accounts) {
  if (accounts.length === 0) {
    connectedAccount = null;
    updateNetworkUI(false);
    $("cardAdmin").hidden = true;
    showStatus("Carteira desconectada.", "neutral");
  } else {
    await initAccount(accounts[0]);
  }
}

async function loadAllData() {
  if (!contract) return;
  await Promise.all([
    loadProjects(),
    loadAdminData(),
    loadUserReputation(),
    loadEvents()
  ]);
}

async function loadAdminData() {
  if (!contract) return;
  try {
    isContractActive = await contract.methods.isActive().call();
    const createBtn = $("btnCreateProject");
    if (createBtn) {
      createBtn.disabled = !isContractActive;
      createBtn.textContent = isContractActive
        ? "🔒 Criar Projeto & Bloquear ETH"
        : "⏸️ Criação Pausada pelo Admin";
    }

    if (!$("cardAdmin").hidden) {
      const feesWei = await contract.methods.accumulatedFees().call();
      const feesEth = parseFloat(web3.utils.fromWei(feesWei, "ether")).toFixed(4);
      $("adminFees").textContent = `${feesEth} ETH`;

      const statusEl = $("adminContractStatus");
      const toggleBtn = $("btnToggleContract");
      if (statusEl && toggleBtn) {
        statusEl.textContent = isContractActive ? "Ativo (Operacional)" : "Pausado (Circuit Breaker)";
        toggleBtn.textContent = isContractActive
          ? "⏸️ Pausar Novas Criações"
          : "▶️ Reativar Contrato";
      }
    }
  } catch (e) {
    console.error("Erro ao carregar dados administrativos:", e);
  }
}

async function loadProjects() {
  if (!contract) return;
  const container = $("listProjects");
  container.innerHTML = `<div class="loading-state">Consultando smart contract na Sepolia...</div>`;
  try {
    const total = await contract.methods.totalProjects().call();
    const totalNum = Number(total);
    loadedProjects = [];
    for (let i = 1; i <= totalNum; i++) {
      try {
        const p = await contract.methods.getProject(i).call();
        loadedProjects.push(p);
      } catch (err) {
        console.warn(`Erro ao carregar projeto ${i}:`, err);
      }
    }
    loadedProjects.reverse();
    updateCounters();
    renderProjects();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Erro ao consultar projetos: ${err.message}</div>`;
  }
}

function updateCounters() {
  $("totalAll").textContent = loadedProjects.length;
  const openCount = loadedProjects.filter((p) => Number(p.status) === 0).length;
  $("totalOpen").textContent = openCount;

  if (connectedAccount) {
    const accLower = connectedAccount.toLowerCase();
    const myCount = loadedProjects.filter(
      (p) => p.client.toLowerCase() === accLower || p.freelancer.toLowerCase() === accLower
    ).length;
    $("totalMine").textContent = myCount;
  } else {
    $("totalMine").textContent = "0";
  }
}

function renderProjects() {
  const container = $("listProjects");
  const emptyState = $("emptyProjects");
  let filtered = [...loadedProjects];

  if (currentFilter === "open") {
    filtered = filtered.filter((p) => Number(p.status) === 0);
  } else if (currentFilter === "mine") {
    if (!connectedAccount) {
      container.innerHTML = `<div class="empty-state">Conecte sua carteira para ver seus projetos.</div>`;
      emptyState.hidden = true;
      return;
    }
    const accLower = connectedAccount.toLowerCase();
    filtered = filtered.filter(
      (p) => p.client.toLowerCase() === accLower || p.freelancer.toLowerCase() === accLower
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  container.innerHTML = filtered.map(createProjectCardHTML).join("");
}

function createProjectCardHTML(p) {
  const statusNum = Number(p.status);
  const statusName = STATUS_NAMES[statusNum] || "Desconhecido";
  const ethValue = web3 ? web3.utils.fromWei(p.amount, "ether") : "0";

  const accLower = connectedAccount ? connectedAccount.toLowerCase() : "";
  const clientLower = p.client.toLowerCase();
  const freelancerLower = p.freelancer.toLowerCase();
  const ownerLower = contractOwner ? contractOwner.toLowerCase() : "";

  const isClient = accLower && accLower === clientLower;
  const isFreelancer = accLower && accLower === freelancerLower;
  const isOwner = accLower && accLower === ownerLower;

  const nowSec = Math.floor(Date.now() / 1000);
  const dueSec = Number(p.dueDate);
  const isExpired = dueSec > 0 && nowSec > dueSec;

  let actionButtons = "";

  if (statusNum === 0) { // Open
    if (!isClient) {
      actionButtons += `<button class="btn btn-sm btn-primary" onclick="acceptDemand(${p.id})">🤝 Aceitar Projeto</button>`;
    } else {
      actionButtons += `<button class="btn btn-sm btn-outline" onclick="cancelDemand(${p.id}, false)">❌ Cancelar Demanda</button>`;
    }
  } else if (statusNum === 1) { // InProgress
    if (isFreelancer) {
      actionButtons += `<button class="btn btn-sm btn-primary" onclick="openModalDelivery(${p.id})">🚀 Submeter Entrega</button>`;
    }
    if (isClient && isExpired) {
      actionButtons += `<button class="btn btn-sm btn-outline" onclick="cancelDemand(${p.id}, true)">⏰ Cancelar por Atraso (Reembolso 100%)</button>`;
    }
    if (isClient || isFreelancer) {
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="openDemandDispute(${p.id})">⚖️ Abrir Disputa</button>`;
    }
  } else if (statusNum === 2) { // Delivered
    if (isClient) {
      actionButtons += `<button class="btn btn-sm btn-primary" onclick="approveDemand(${p.id})">✅ Aprovar & Liberar Pagamento</button>`;
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="openDemandDispute(${p.id})">⚖️ Abrir Disputa</button>`;
    } else if (isFreelancer) {
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="openDemandDispute(${p.id})">⚖️ Abrir Disputa</button>`;
    }
  } else if (statusNum === 5) { // InDispute
    if (isOwner) {
      actionButtons += `<button class="btn btn-sm btn-danger" onclick="openModalDispute(${p.id})">⚖️ Resolver Disputa (Admin)</button>`;
    }
  }

  // Renderização segura do link de entrega (deliveryUrl) para auditoria do cliente
  let deliveryUrlHTML = "";
  if (p.deliveryUrl && p.deliveryUrl.trim().length > 0) {
    const rawUrl = p.deliveryUrl.trim();
    const safeHref = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    deliveryUrlHTML = `
      <div class="detail-item">
        <span>Link da Entrega (Auditoria):</span>
        <strong><a href="${escapeHTML(safeHref)}" target="_blank" rel="noopener noreferrer">${escapeHTML(rawUrl)} ↗</a></strong>
      </div>
    `;
  }

  const hashFormatted = p.deliveryHash && p.deliveryHash !== ZERO_BYTES32
    ? `<div class="detail-item"><span class="hash-label">Comprovante (bytes32):</span><strong class="hash-val">${p.deliveryHash}</strong></div>`
    : "";

  const dateStr = dueSec > 0 ? new Date(dueSec * 1000).toLocaleDateString("pt-BR") : "N/A";
  const deadlineBadge = (statusNum === 1 && isExpired) ? " ⚠️ (Expirado)" : "";

  return `
    <article class="project-card">
      <div class="project-top">
        <div><h3 class="project-title">#${p.id} · ${escapeHTML(p.title)}</h3></div>
        <span class="status-badge status-${statusNum}">${statusName}</span>
      </div>
      <p class="project-desc">${escapeHTML(p.description)}</p>
      <div class="project-details">
        <div class="detail-item"><span>Depósito em Caução:</span><strong>${ethValue} ETH</strong></div>
        <div class="detail-item"><span>Prazo (Due Date):</span><strong>${dateStr}${deadlineBadge}</strong></div>
        <div class="detail-item"><span>Cliente:</span><strong>${p.client.slice(0, 6)}...${p.client.slice(-4)}</strong></div>
        <div class="detail-item"><span>Freelancer:</span><strong>${p.freelancer === ZERO_ADDRESS ? "Aguardando..." : p.freelancer.slice(0, 6) + "..." + p.freelancer.slice(-4)}</strong></div>
        ${deliveryUrlHTML}
        ${hashFormatted}
      </div>
      ${actionButtons ? `<div class="project-actions">${actionButtons}</div>` : ""}
    </article>
  `;
}

// =========================================================================
// OPERAÇÕES DE ESCRITA NO CONTRATO (.send) — COM MODAIS ASSÍNCRONOS
// =========================================================================

async function createNewProject() {
  if (!(await validateConnection())) return;
  if (!isContractActive) {
    await showAlertModal("O contrato está temporariamente pausado pelo administrador.");
    return;
  }

  const title = $("projectTitle").value.trim();
  const description = $("projectDescription").value.trim();
  const amountEth = $("projectAmount").value.trim();
  const dateInput = $("projectDueDate").value;

  if (!title || !description || !amountEth || !dateInput) {
    await showAlertModal("Preencha todos os campos do projeto, prazo e o valor em ETH.");
    return;
  }
  const amountNum = parseFloat(amountEth);
  if (isNaN(amountNum) || amountNum <= 0) {
    await showAlertModal("Informe um valor de depósito válido em ETH maior que zero.");
    return;
  }

  // Correção de fuso horário: interpreta o input date explicitamente como UTC para alinhar com o bloco Ethereum
  const dueDateTimestamp = Math.floor(new Date(`${dateInput}T23:59:59Z`).getTime() / 1000);
  const currentTimestamp = Math.floor(Date.now() / 1000);

  if (isNaN(dueDateTimestamp) || dueDateTimestamp <= currentTimestamp) {
    await showAlertModal("O prazo de entrega deve ser uma data válida no futuro.");
    return;
  }

  const amountWei = web3.utils.toWei(amountEth, "ether");
  await executeTransaction(
    () => contract.methods.createProject(title, description, dueDateTimestamp).send({
      from: connectedAccount,
      value: amountWei
    }),
    "Projeto publicado e ETH retido em caução com sucesso"
  );
  $("formCreateProject").reset();
  await loadAllData();
}

async function acceptDemand(id) {
  if (!(await validateConnection())) return;
  await executeTransaction(
    () => contract.methods.acceptProject(id).send({ from: connectedAccount }),
    `Projeto #${id} aceito com sucesso`
  );
  await loadAllData();
}

async function cancelDemand(id, isLateCancel = false) {
  if (!(await validateConnection())) return;

  const confirmed = await showConfirmModal({
    title: isLateCancel ? "⏰ Cancelar Projeto por Atraso" : "❌ Cancelar Demanda",
    message: isLateCancel
      ? "O prazo de entrega expirou. Deseja cancelar o projeto por atraso, recuperar 100% do seu ETH e aplicar penalidade de reputação (-15 pts) ao freelancer?"
      : "Deseja realmente cancelar este projeto aberto e receber 100% do seu ETH de volta?",
    confirmText: "Sim, Cancelar e Reembolsar",
    variant: "danger"
  });

  if (!confirmed) return;

  await executeTransaction(
    () => contract.methods.cancelProject(id).send({ from: connectedAccount }),
    `Projeto #${id} cancelado e ETH reembolsado com sucesso`
  );
  await loadAllData();
}

async function submitDelivery() {
  if (!(await validateConnection()) || !modalProjectId) {
    await showAlertModal("Erro interno: Nenhum projeto selecionado para entrega ou não foi possível estabelecer conexão.");
    return;
  }

  const deliveryUrl = $("deliveryText").value.trim();
  const hash = $("previewDeliveryHash").textContent;

  if (!deliveryUrl || !hash || hash === ZERO_BYTES32) {
    await showAlertModal("Informe uma URL ou texto válido de entrega para gerar o comprovante.");
    return;
  }

  const projectId = modalProjectId;
  closeModalDelivery();

  await executeTransaction(
    () => contract.methods.deliverProject(projectId, deliveryUrl, hash).send({ from: connectedAccount }),
    `Entrega do projeto #${projectId} (URL + Hash bytes32) registrada na blockchain`
  );
  await loadAllData();
}

async function approveDemand(id) {
  if (!(await validateConnection())) return;

  const confirmed = await showConfirmModal({
    title: "✅ Aprovar Entrega e Liberar Pagamento",
    message: "Você já auditou o link de entrega? Ao confirmar, 98% do valor em custódia serão transferidos ao freelancer (2% de taxa da plataforma) e ele receberá +10 pontos de reputação.",
    confirmText: "Aprovar & Pagar Freelancer",
    variant: "primary"
  });

  if (!confirmed) return;

  await executeTransaction(
    () => contract.methods.approveAndComplete(id).send({ from: connectedAccount }),
    `Projeto #${id} aprovado! Pagamento liberado e reputação do freelancer bonificada (+10 pts)`
  );
  await loadAllData();
}

async function openDemandDispute(id) {
  if (!(await validateConnection())) return;

  const confirmed = await showConfirmModal({
    title: "⚖️ Abrir Disputa Oficial",
    message: "Deseja abrir uma disputa para este projeto? Os fundos ficarão travados no contrato até a mediação do administrador.",
    confirmText: "Abrir Disputa",
    variant: "danger"
  });

  if (!confirmed) return;

  await executeTransaction(
    () => contract.methods.openDispute(id).send({ from: connectedAccount }),
    `Disputa aberta para o projeto #${id}. Aguarde a mediação.`
  );
  await loadAllData();
}

async function executeDisputeResolution() {
  if (!(await validateConnection()) || !modalProjectId) return;
  const percentage = parseInt($("freelancerPercentage").value, 10);
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    await showAlertModal("Informe um percentual válido entre 0 e 100.");
    return;
  }

  const projectId = modalProjectId;
  closeModalDispute();

  await executeTransaction(
    () => contract.methods.resolveDispute(projectId, percentage).send({ from: connectedAccount }),
    `Disputa do projeto #${projectId} resolvida com sucesso (${percentage}% freelancer)`
  );
  await loadAllData();
}

async function withdrawPlatformFees() {
  if (!(await validateConnection())) return;

  const confirmed = await showConfirmModal({
    title: "💰 Sacar Taxas Acumuladas",
    message: "Deseja transferir todo o saldo de taxas acumuladas da plataforma para a carteira do administrador?",
    confirmText: "Sacar Taxas",
    variant: "primary"
  });

  if (!confirmed) return;

  await executeTransaction(
    () => contract.methods.withdrawFees().send({ from: connectedAccount }),
    "Taxas da plataforma sacadas com sucesso para a carteira do dono"
  );
  await loadAllData();
}

async function toggleContractStatus() {
  if (!(await validateConnection())) return;
  const actionText = isContractActive ? "pausar" : "reativar";

  const confirmed = await showConfirmModal({
    title: "🛡️ Alterar Status Operacional (Circuit Breaker)",
    message: `Deseja realmente ${actionText} a criação de novos projetos no contrato inteligente?`,
    confirmText: isContractActive ? "Pausar Contrato" : "Reativar Contrato",
    variant: isContractActive ? "danger" : "primary"
  });

  if (!confirmed) return;

  await executeTransaction(
    () => contract.methods.toggleContractActive().send({ from: connectedAccount }),
    "Status operacional do contrato atualizado com sucesso"
  );
  await loadAllData();
}

// =========================================================================
// GESTÃO DE MODAIS E HASHING (KECCAK-256 COESO COM O SOLIDITY)
// =========================================================================

function openModalDelivery(id) {
  modalProjectId = id;
  $("deliveryText").value = "";
  generateLocalHash();
  $("modalDelivery").hidden = false;
}

function closeModalDelivery() {
  modalProjectId = null;
  $("modalDelivery").hidden = true;
}

function generateLocalHash() {
  const text = $("deliveryText").value.trim();
  if (!text || !web3) {
    $("previewDeliveryHash").textContent = ZERO_BYTES32;
    return;
  }
  const hash = web3.utils.keccak256(text);
  $("previewDeliveryHash").textContent = hash;
}

function openModalDispute(id) {
  modalProjectId = id;
  $("freelancerPercentage").value = 50;
  updateDisputePreview();
  $("modalDispute").hidden = false;
}

function closeModalDispute() {
  modalProjectId = null;
  $("modalDispute").hidden = true;
}

function updateDisputePreview() {
  const freeVal = parseInt($("freelancerPercentage").value || 0, 10);
  const clientVal = 100 - freeVal;
  $("previewDisputeSplit").textContent = `Freelancer: ${freeVal}% | Cliente: ${clientVal}%`;
}

// =========================================================================
// MODAL DINÂMICO DE CONFIRMAÇÃO E ALERTA (SUBSTITUI window.confirm / alert)
// =========================================================================

let dialogResolveFn = null;

function closeDialogModal(result = false) {
  const modal = $("modalDialog");
  if (modal) modal.hidden = true;
  if (dialogResolveFn) {
    const resolve = dialogResolveFn;
    dialogResolveFn = null;
    resolve(result);
  }
}

function showConfirmModal({
  title = "Confirmar Ação",
  message = "Deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary"
}) {
  return new Promise((resolve) => {
    dialogResolveFn = resolve;

    $("dialogTitle").textContent = title;
    $("dialogMessage").textContent = message;

    const btnConfirm = $("btnConfirmDialog");
    const btnCancel = $("btnCancelDialog");
    const btnClose = $("btnCloseDialog");

    btnConfirm.textContent = confirmText;
    btnConfirm.className = `btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`;

    btnCancel.textContent = cancelText;
    btnCancel.hidden = false;

    btnConfirm.onclick = () => closeDialogModal(true);
    btnCancel.onclick = () => closeDialogModal(false);
    btnClose.onclick = () => closeDialogModal(false);

    $("modalDialog").hidden = false;
  });
}

function showAlertModal(message, title = "⚠️ Atenção") {
  return new Promise((resolve) => {
    dialogResolveFn = resolve;

    $("dialogTitle").textContent = title;
    $("dialogMessage").textContent = message;

    const btnConfirm = $("btnConfirmDialog");
    const btnCancel = $("btnCancelDialog");
    const btnClose = $("btnCloseDialog");

    btnConfirm.textContent = "Entendi";
    btnConfirm.className = "btn btn-primary";
    btnCancel.hidden = true;

    btnConfirm.onclick = () => closeDialogModal(true);
    btnClose.onclick = () => closeDialogModal(true);

    $("modalDialog").hidden = false;
  });
}

// =========================================================================
// FEED DE EVENTOS ON-CHAIN
// =========================================================================

async function loadEvents() {
  if (!contract) return;
  const feed = $("feedEvents");

  try {
    const currentBlock = await web3.eth.getBlockNumber();
    const range = 9000n;
    const fromBlock = (currentBlock - range) > 0n ? (currentBlock - range) : 0n;

    const eventos = await contract.getPastEvents("allEvents", {
      fromBlock: fromBlock,
      toBlock: "latest"
    });

    if (!eventos || eventos.length === 0) {
      feed.innerHTML = `<div class="feed-empty">Nenhum evento registrado nos blocos recentes.</div>`;
      return;
    }

    const recentes = [...eventos].reverse().slice(0, 10);

    feed.innerHTML = recentes.map((ev) => {
      let cssClass = "info";
      let text = ev.event;
      const vals = ev.returnValues;

      if (ev.event === "ProjectCreated") {
        cssClass = "success";
        text = `Projeto #${vals.id} criado por ${vals.client.slice(0, 6)}... (${web3.utils.fromWei(vals.amount, "ether")} ETH)`;
      } else if (ev.event === "ProjectAccepted") {
        cssClass = "info";
        text = `Projeto #${vals.id} aceito pelo freelancer ${vals.freelancer.slice(0, 6)}...`;
      } else if (ev.event === "ProjectDelivered") {
        cssClass = "warn";
        text = `Entrega submetida para o Projeto #${vals.id}`;
      } else if (ev.event === "ProjectCompleted") {
        cssClass = "success";
        text = `Projeto #${vals.id} finalizado e pago ao freelancer!`;
      } else if (ev.event === "ProjectCanceled") {
        cssClass = "danger";
        text = `Projeto #${vals.id} cancelado e reembolsado ao cliente`;
      } else if (ev.event === "DisputeOpened") {
        cssClass = "danger";
        text = `Disputa aberta para o Projeto #${vals.id}`;
      } else if (ev.event === "DisputeResolved") {
        cssClass = "info";
        text = `Disputa do Projeto #${vals.id} resolvida pelo mediador`;
      } else if (ev.event === "FeesWithdrawn") {
        cssClass = "info";
        text = `Taxas da plataforma sacadas pelo administrador`;
      } else if (ev.event === "ContractStatusToggled") {
        cssClass = "warn";
        text = `Status do contrato alterado para: ${vals.isActive ? "Ativo" : "Pausado"}`;
      }

      return `
        <div class="event-entry ${cssClass}">
          <strong>${escapeHTML(text)}</strong>
          <div class="event-meta">
            <span>Bloco #${ev.blockNumber}</span>
            <a href="${SEPOLIA_EXPLORER_TX}${ev.transactionHash}" target="_blank" rel="noopener">Etherscan ↗</a>
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    console.warn("Erro ao buscar eventos passados:", e);
    feed.innerHTML = `<div class="feed-empty">Eventos indisponíveis no nó RPC atual.</div>`;
  }
}

// =========================================================================
// EXECUTOR DE TRANSAÇÕES & TRATAMENTO DE ERROS
// =========================================================================

async function executeTransaction(txPromiseFn, successMsg) {
  const link = $("txLink");
  link.hidden = true;
  link.href = "#";
  try {
    showStatus("⏳ Aguardando aprovação na MetaMask...", "pending");
    const promise = txPromiseFn();
    promise.on("transactionHash", (hash) => {
      showStatus(`Transação enviada! Aguardando mineração na Sepolia...`, "pending");
      link.href = `${SEPOLIA_EXPLORER_TX}${hash}`;
      link.hidden = false;
    });
    const receipt = await promise;
    showStatus(`✅ ${successMsg}!`, "good", 8000);
    link.href = `${SEPOLIA_EXPLORER_TX}${receipt.transactionHash}`;
    link.hidden = false;
    await loadBalance();
    return receipt;
  } catch (err) {
    handleError(err, "Falha na transação");
  }
}

function showStatus(message, type = "neutral", durationMs = 0) {
  const banner = $("statusBanner");
  const msg = $("statusMessage");
  const icon = $("statusIcon");
  banner.className = `status-banner ${type}`;
  msg.textContent = message;
  if (type === "good") icon.textContent = "✅";
  else if (type === "bad") icon.textContent = "❌";
  else if (type === "pending") icon.textContent = "⏳";
  else icon.textContent = "ℹ️";
  banner.hidden = false;
  if (durationMs > 0) {
    setTimeout(() => { if (banner.className.includes(type)) banner.hidden = true; }, durationMs);
  }
}

function handleError(err, context = "Erro") {
  console.error(`${context}:`, err);
  let friendlyMsg = err.message || "Erro desconhecido.";
  if (err.code === 4001 || err.message?.includes("rejected")) {
    friendlyMsg = "Transação cancelada ou rejeitada pelo usuário na MetaMask.";
  } else if (err.code === -32002) {
    friendlyMsg = "Já existe uma solicitação pendente na MetaMask. Abra a extensão para confirmar.";
  } else if (err.message?.includes("insufficient funds") || err.message?.includes("gas required exceeds allowance")) {
    friendlyMsg = "Saldo insuficiente de SepoliaETH na carteira para cobrir o depósito e a taxa de gas.";
  } else if (err.message?.includes("AccessDenied")) {
    friendlyMsg = "Acesso Negado: sua carteira não possui permissão para executar esta ação.";
  } else if (err.message?.includes("IncorrectStatus")) {
    friendlyMsg = "Status Incorreto: o projeto não está na fase necessária para esta operação.";
  } else if (err.message?.includes("InvalidAmount")) {
    friendlyMsg = "Valor Inválido: o montante de ETH deve ser maior que zero.";
  } else if (err.message?.includes("InvalidData")) {
    friendlyMsg = "Dados Inválidos: verifique os campos informados ou a integridade do hash.";
  } else if (err.message?.includes("DeadlineNotExpired")) {
    friendlyMsg = "O prazo de entrega ainda não expirou para permitir cancelamento unilateral.";
  } else if (err.message?.includes("ContractPaused")) {
    friendlyMsg = "Contrato Pausado: novas criações de projetos estão temporariamente suspensas.";
  }
  showStatus(`❌ ${context}: ${friendlyMsg}`, "bad", 8000);
}

async function validateConnection() {
  if (!connectedAccount) {
    await showAlertModal("Por favor, conecte sua carteira MetaMask primeiro.");
    return false;
  }
  if (!isSepoliaOk) {
    await showAlertModal("Você deve estar conectado à rede Ethereum Sepolia.");
    await checkAndSwitchToSepolia();
    return false;
  }
  if (!contract) {
    await showAlertModal("Contrato não configurado em frontend/config.js. Insira o endereço após o deploy.");
    return false;
  }
  return true;
}

function escapeHTML(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}