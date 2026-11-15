/**
 * SMART FREELA — APLICAÇÃO WEB3.JS (FRONTEND)
 * Conexão com MetaMask, verificação de rede Sepolia, chamadas .call e .send,
 * escuta de eventos e tratamento de erros.
 */

// Constantes da rede Sepolia
const SEPOLIA_CHAIN_ID_DEC = 11155111n;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

// Nomes legíveis e classes de estilo para os estados do enum StatusProjeto
const STATUS_NOMES = [
  "Aberto",        // 0
  "Em Andamento",  // 1
  "Entregue",      // 2
  "Finalizado",    // 3
  "Cancelado",     // 4
  "Em Disputa"     // 5
];

// Estado da aplicação
let web3 = null;
let contract = null;
let contaConectada = null;
let donoContrato = null;
let redeSepoliaOk = false;
let projetosCarregados = [];
let filtroAtual = "todos";
let modalProjetoId = null;

// Atalho para buscar elementos do DOM
const $ = (id) => document.getElementById(id);

// Inicialização ao carregar a página
window.addEventListener("DOMContentLoaded", async () => {
  configurarBotoes();
  configurarFiltros();
  verificarConfiguracaoContrato();

  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    // Tenta reconexão silenciosa se já autorizado
    const contas = await window.ethereum.request({ method: "eth_accounts" });
    if (contas && contas.length > 0) {
      await inicializarComConta(contas[0]);
    }
    // Ouvintes reativos de conta e rede
    window.ethereum.on("accountsChanged", lidarComMudancaConta);
    window.ethereum.on("chainChanged", () => window.location.reload());
  } else {
    exibirStatus("MetaMask não encontrada. Por favor, instale a extensão MetaMask.", "bad");
  }
});

/**
 * Valida se o endereço do contrato foi configurado
 */
function verificarConfiguracaoContrato() {
  if (
    typeof CONTRACT_ADDRESS === "undefined" ||
    !CONTRACT_ADDRESS ||
    CONTRACT_ADDRESS.includes("COLOQUE_O_ENDERECO")
  ) {
    $("contractWarning").hidden = false;
  } else {
    $("contractWarning").hidden = true;
  }
}

/**
 * Configura listeners dos botões da interface
 */
function configurarBotoes() {
  $("connectBtn").onclick = conectarCarteira;
  $("btnCriarProjeto").onclick = criarNovoProjeto;
  $("btnSacarTaxas").onclick = sacarTaxasPlataforma;
  $("btnAtualizar").onclick = carregarDados;
  $("btnConfirmarEntrega").onclick = submeterEntrega;
  $("btnConfirmarResolucao").onclick = executarResolucaoDisputa;
}

/**
 * Configura abas de filtro dos projetos
 */
function configurarFiltros() {
  const tabs = document.querySelectorAll(".filter-tabs .tab");
  tabs.forEach((tab) => {
    tab.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      filtroAtual = tab.dataset.filter;
      renderizarProjetos();
    };
  });
}

/**
 * Conecta a carteira MetaMask e valida a rede Sepolia
 */
async function conectarCarteira() {
  if (!window.ethereum) {
    alert("MetaMask não detectada. Instale a extensão no seu navegador.");
    return;
  }

  try {
    exibirStatus("Solicitando autorização na MetaMask...", "pending");
    const contas = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (contas.length === 0) {
      exibirStatus("Nenhuma conta selecionada.", "bad");
      return;
    }
    await inicializarComConta(contas[0]);
  } catch (err) {
    tratarErro(err, "Falha ao conectar MetaMask");
  }
}

/**
 * Inicializa a sessão com a conta selecionada
 */
async function inicializarComConta(conta) {
  contaConectada = conta;
  web3 = new Web3(window.ethereum);

  // Valida e solicita troca para Sepolia se necessário
  await verificarETrocarParaSepolia();

  if (!redeSepoliaOk) {
    atualizarUINetwork(false);
    return;
  }

  atualizarUINetwork(true);
  await carregarSaldo();

  // Instancia o contrato
  if ($("contractWarning").hidden) {
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    try {
      donoContrato = await contract.methods.dono().call();
      verificarPainelAdmin();
    } catch (e) {
      console.warn("Não foi possível carregar dono do contrato:", e);
    }
    await carregarDados();
  }
}

/**
 * Valida a rede conectada e solicita troca automática para a Sepolia
 */
async function verificarETrocarParaSepolia() {
  try {
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const chainIdDec = BigInt(chainIdHex);

    if (chainIdDec === SEPOLIA_CHAIN_ID_DEC) {
      redeSepoliaOk = true;
      return true;
    }

    // Solicita a troca de rede
    exibirStatus("Solicitando mudança para a rede Ethereum Sepolia...", "pending");
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
    redeSepoliaOk = true;
    return true;
  } catch (switchError) {
    // Código 4902 indica que a rede Sepolia não está adicionada na MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        redeSepoliaOk = true;
        return true;
      } catch (addError) {
        tratarErro(addError, "Erro ao adicionar rede Sepolia");
      }
    } else {
      tratarErro(switchError, "Rede incorreta. Conecte-se à Ethereum Sepolia");
    }
    redeSepoliaOk = false;
    return false;
  }
}

/**
 * Atualiza o indicador visual da rede e conta conectada
 */
function atualizarUINetwork(conectado) {
  const dot = $("networkDot");
  const netText = $("networkText");
  const walletAcc = $("walletAccount");
  const btn = $("connectBtn");

  if (conectado && redeSepoliaOk && contaConectada) {
    dot.className = "dot ok";
    netText.textContent = "Sepolia Conectada";
    walletAcc.textContent = `${contaConectada.slice(0, 6)}...${contaConectada.slice(-4)}`;
    btn.textContent = "Conectado";
    btn.disabled = true;
    exibirStatus("Conectado com sucesso à Ethereum Sepolia.", "good", 3000);
  } else if (contaConectada && !redeSepoliaOk) {
    dot.className = "dot warn";
    netText.textContent = "Rede Incorreta";
    walletAcc.textContent = "Mude para Sepolia na MetaMask";
    btn.textContent = "Trocar Rede";
    btn.disabled = false;
    btn.onclick = verificarETrocarParaSepolia;
  } else {
    dot.className = "dot";
    netText.textContent = "MetaMask Desconectada";
    walletAcc.textContent = "Clique para conectar";
    btn.textContent = "Conectar MetaMask";
    btn.disabled = false;
    btn.onclick = conectarCarteira;
  }
}

/**
 * Carrega saldo em ETH da conta conectada
 */
async function carregarSaldo() {
  if (!web3 || !contaConectada) return;
  try {
    const balanceWei = await web3.eth.getBalance(contaConectada);
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, "ether")).toFixed(4);
    $("walletBalance").textContent = `${balanceEth} ETH`;
  } catch (e) {
    console.error("Erro ao carregar saldo:", e);
  }
}

/**
 * Exibe ou oculta o painel administrativo caso a carteira seja o dono
 */
function verificarPainelAdmin() {
  if (
    donoContrato &&
    contaConectada &&
    donoContrato.toLowerCase() === contaConectada.toLowerCase()
  ) {
    $("cardAdmin").hidden = false;
  } else {
    $("cardAdmin").hidden = true;
  }
}

/**
 * Lida com troca de conta na MetaMask
 */
async function lidarComMudancaConta(contas) {
  if (contas.length === 0) {
    contaConectada = null;
    atualizarUINetwork(false);
    $("cardAdmin").hidden = true;
    exibirStatus("Carteira desconectada.", "neutral");
  } else {
    await inicializarComConta(contas[0]);
  }
}

/**
 * Carrega todos os dados: projetos, taxas e feed de eventos
 */
async function carregarDados() {
  if (!contract) return;
  await Promise.all([carregarProjetos(), carregarTaxasAdmin(), carregarEventos()]);
}

/**
 * Carrega taxas acumuladas no painel do administrador
 */
async function carregarTaxasAdmin() {
  if (!contract || $("cardAdmin").hidden) return;
  try {
    const taxasWei = await contract.methods.taxasAcumuladas().call();
    const taxasEth = parseFloat(web3.utils.fromWei(taxasWei, "ether")).toFixed(4);
    $("adminTaxas").textContent = `${taxasEth} ETH`;
  } catch (e) {
    console.error("Erro ao carregar taxas da plataforma:", e);
  }
}

/**
 * Consulta todos os projetos registrados no contrato
 */
async function carregarProjetos() {
  if (!contract) return;

  const container = $("listaProjetos");
  container.innerHTML = `<div class="loading-state">Consultando smart contract na Sepolia...</div>`;

  try {
    const total = await contract.methods.totalProjetos().call();
    const totalNum = Number(total);

    projetosCarregados = [];

    for (let i = 1; i <= totalNum; i++) {
      try {
        const p = await contract.methods.obterProjeto(i).call();
        projetosCarregados.push(p);
      } catch (err) {
        console.warn(`Erro ao carregar projeto ${i}:`, err);
      }
    }

    // Inverte para exibir os mais recentes primeiro
    projetosCarregados.reverse();

    atualizarContadores();
    renderizarProjetos();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Erro ao consultar projetos: ${err.message}</div>`;
  }
}

/**
 * Atualiza números nos botões de filtro
 */
function atualizarContadores() {
  $("totalTodos").textContent = projetosCarregados.length;

  const abertos = projetosCarregados.filter((p) => Number(p.status) === 0).length;
  $("totalAbertos").textContent = abertos;

  if (contaConectada) {
    const contaLower = contaConectada.toLowerCase();
    const meus = projetosCarregados.filter(
      (p) =>
        p.cliente.toLowerCase() === contaLower ||
        p.freelancer.toLowerCase() === contaLower
    ).length;
    $("totalMeus").textContent = meus;
  } else {
    $("totalMeus").textContent = "0";
  }
}

/**
 * Renderiza a lista de projetos conforme o filtro selecionado
 */
function renderizarProjetos() {
  const container = $("listaProjetos");
  const semProjetos = $("semProjetos");

  let filtrados = [...projetosCarregados];

  if (filtroAtual === "abertos") {
    filtrados = filtrados.filter((p) => Number(p.status) === 0);
  } else if (filtroAtual === "meus") {
    if (!contaConectada) {
      container.innerHTML = `<div class="empty-state">Conecte sua carteira para ver seus projetos.</div>`;
      semProjetos.hidden = true;
      return;
    }
    const contaLower = contaConectada.toLowerCase();
    filtrados = filtrados.filter(
      (p) =>
        p.cliente.toLowerCase() === contaLower ||
        p.freelancer.toLowerCase() === contaLower
    );
  }

  if (filtrados.length === 0) {
    container.innerHTML = "";
    semProjetos.hidden = false;
    return;
  }

  semProjetos.hidden = true;
  container.innerHTML = filtrados.map(criarCardProjetoHTML).join("");
}

/**
 * Constrói o HTML de cada card de projeto
 */
function criarCardProjetoHTML(p) {
  const statusNum = Number(p.status);
  const statusNome = STATUS_NOMES[statusNum] || "Desconhecido";
  const valorEth = web3 ? web3.utils.fromWei(p.valor, "ether") : "0";

  const contaLower = contaConectada ? contaConectada.toLowerCase() : "";
  const clienteLower = p.cliente.toLowerCase();
  const freelancerLower = p.freelancer.toLowerCase();
  const donoLower = donoContrato ? donoContrato.toLowerCase() : "";

  const souCliente = contaLower && contaLower === clienteLower;
  const souFreelancer = contaLower && contaLower === freelancerLower;
  const souDono = contaLower && contaLower === donoLower;

  let botoesAcao = "";

  // Ações contextuais por estado
  if (statusNum === 0) {
    // Aberto
    if (!souCliente) {
      botoesAcao += `<button class="btn btn-sm btn-primary" onclick="aceitarDemanda(${p.id})">🤝 Aceitar Projeto</button>`;
    } else {
      botoesAcao += `<button class="btn btn-sm btn-outline" onclick="cancelarDemanda(${p.id})">❌ Cancelar Demanda</button>`;
    }
  } else if (statusNum === 1) {
    // Em Andamento
    if (souFreelancer) {
      botoesAcao += `<button class="btn btn-sm btn-primary" onclick="abrirModalEntrega(${p.id})">🚀 Submeter Entrega</button>`;
    }
    if (souCliente || souFreelancer) {
      botoesAcao += `<button class="btn btn-sm btn-danger" onclick="abrirDisputaDemanda(${p.id})">⚖️ Abrir Disputa</button>`;
    }
  } else if (statusNum === 2) {
    // Entregue
    if (souCliente) {
      botoesAcao += `<button class="btn btn-sm btn-primary" onclick="aprovarDemanda(${p.id})">✅ Aprovar & Liberar Pagamento</button>`;
      botoesAcao += `<button class="btn btn-sm btn-danger" onclick="abrirDisputaDemanda(${p.id})">⚖️ Abrir Disputa</button>`;
    } else if (souFreelancer) {
      botoesAcao += `<button class="btn btn-sm btn-danger" onclick="abrirDisputaDemanda(${p.id})">⚖️ Abrir Disputa</button>`;
    }
  } else if (statusNum === 5) {
    // Em Disputa
    if (souDono) {
      botoesAcao += `<button class="btn btn-sm btn-danger" onclick="abrirModalDisputa(${p.id})">⚖️ Resolver Disputa (Admin)</button>`;
    }
  }

  const hashFormatado =
    p.hashEntrega && p.hashEntrega !== "0x0000000000000000000000000000000000000000000000000000000000000000"
      ? `<div class="detail-item"><span class="hash-label">Comprovante (bytes32):</span><strong class="hash-val">${p.hashEntrega}</strong></div>`
      : "";

  return `
    <article class="project-card">
      <div class="project-top">
        <div>
          <h3 class="project-title">#${p.id} · ${escaparHTML(p.titulo)}</h3>
        </div>
        <span class="status-badge status-${statusNum}">${statusNome}</span>
      </div>

      <p class="project-desc">${escaparHTML(p.descricao)}</p>

      <div class="project-details">
        <div class="detail-item">
          <span>Depósito em Caução:</span>
          <strong>${valorEth} ETH</strong>
        </div>
        <div class="detail-item">
          <span>Cliente:</span>
          <strong>${p.cliente.slice(0, 6)}...${p.cliente.slice(-4)}</strong>
        </div>
        <div class="detail-item">
          <span>Freelancer:</span>
          <strong>${p.freelancer === "0x0000000000000000000000000000000000000000" ? "Aguardando..." : p.freelancer.slice(0, 6) + "..." + p.freelancer.slice(-4)}</strong>
        </div>
        ${hashFormatado}
      </div>

      ${botoesAcao ? `<div class="project-actions">${botoesAcao}</div>` : ""}
    </article>
  `;
}

// =========================================================================
// OPERAÇÕES DE ESCRITA NO CONTRATO (.send com ETH ou não)
// =========================================================================

/**
 * Criação de novo projeto com envio de ETH (payable)
 */
async function criarNovoProjeto() {
  if (!validarConexao()) return;

  const titulo = $("tituloProjeto").value.trim();
  const descricao = $("descricaoProjeto").value.trim();
  const valorEth = $("valorProjeto").value.trim();

  if (!titulo || !descricao || !valorEth) {
    alert("Preencha todos os campos do projeto e o valor em ETH.");
    return;
  }

  const valorNum = parseFloat(valorEth);
  if (isNaN(valorNum) || valorNum <= 0) {
    alert("Informe um valor de depósito válido em ETH maior que zero.");
    return;
  }

  const valorWei = web3.utils.toWei(valorEth, "ether");

  await executarTransacao(
    () =>
      contract.methods
        .criarProjeto(titulo, descricao)
        .send({ from: contaConectada, value: valorWei }),
    "Projeto publicado e ETH retido em caução com sucesso"
  );

  $("formCriarProjeto").reset();
  await carregarDados();
}

/**
 * Freelancer aceita demanda
 */
async function aceitarDemanda(id) {
  if (!validarConexao()) return;
  await executarTransacao(
    () => contract.methods.aceitarProjeto(id).send({ from: contaConectada }),
    `Projeto #${id} aceito com sucesso`
  );
  await carregarDados();
}

/**
 * Cancelamento de projeto aberto pelo cliente
 */
async function cancelarDemanda(id) {
  if (!validarConexao()) return;
  if (!confirm("Deseja realmente cancelar este projeto e receber 100% do seu ETH de volta?")) {
    return;
  }
  await executarTransacao(
    () => contract.methods.cancelarProjeto(id).send({ from: contaConectada }),
    `Projeto #${id} cancelado e ETH reembolsado com sucesso`
  );
  await carregarDados();
}

/**
 * Submissão de entrega pelo freelancer (com hash bytes32)
 */
async function submeterEntrega() {
  if (!validarConexao() || !modalProjetoId) return;

  const hash = $("previewHashEntrega").textContent;
  if (!hash || hash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
    alert("Informe um texto ou link válido para gerar o hash da entrega.");
    return;
  }

  fecharModalEntrega();

  await executarTransacao(
    () => contract.methods.entregarProjeto(modalProjetoId, hash).send({ from: contaConectada }),
    `Entrega do projeto #${modalProjetoId} registrada na blockchain`
  );
  await carregarDados();
}

/**
 * Cliente aprova a entrega e libera pagamento ao freelancer
 */
async function aprovarDemanda(id) {
  if (!validarConexao()) return;
  if (!confirm("Aprovar a entrega e liberar o pagamento líquido ao freelancer?")) return;

  await executarTransacao(
    () => contract.methods.aprovarEFinalizar(id).send({ from: contaConectada }),
    `Projeto #${id} aprovado e pagamento liberado ao freelancer (taxa retida)`
  );
  await carregarDados();
}

/**
 * Abertura de disputa
 */
async function abrirDisputaDemanda(id) {
  if (!validarConexao()) return;
  if (!confirm("Abrir uma disputa oficial para este projeto? Os fundos ficarão travados para mediação.")) {
    return;
  }

  await executarTransacao(
    () => contract.methods.abrirDisputa(id).send({ from: contaConectada }),
    `Disputa aberta para o projeto #${id}. Aguarde a mediação.`
  );
  await carregarDados();
}

/**
 * Executa resolução de disputa (Administrador)
 */
async function executarResolucaoDisputa() {
  if (!validarConexao() || !modalProjetoId) return;

  const percentual = parseInt($("percentualFreelancer").value, 10);
  if (isNaN(percentual) || percentual < 0 || percentual > 100) {
    alert("Informe um percentual válido entre 0 e 100.");
    return;
  }

  fecharModalDisputa();

  await executarTransacao(
    () => contract.methods.resolverDisputa(modalProjetoId, percentual).send({ from: contaConectada }),
    `Disputa do projeto #${modalProjetoId} resolvida com sucesso (${percentual}% freelancer)`
  );
  await carregarDados();
}

/**
 * Dono saca taxas acumuladas
 */
async function sacarTaxasPlataforma() {
  if (!validarConexao()) return;

  await executarTransacao(
    () => contract.methods.sacarTaxas().send({ from: contaConectada }),
    "Taxas da plataforma sacadas com sucesso para a carteira do dono"
  );
  await carregarDados();
}

// =========================================================================
// GESTÃO DE MODAIS E HASHING
// =========================================================================

function abrirModalEntrega(id) {
  modalProjetoId = id;
  $("textoEntrega").value = "";
  gerarHashLocal();
  $("modalEntrega").hidden = false;
}

function fecharModalEntrega() {
  modalProjetoId = null;
  $("modalEntrega").hidden = true;
}

function gerarHashLocal() {
  const texto = $("textoEntrega").value.trim();
  if (!texto) {
    $("previewHashEntrega").textContent =
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    return;
  }
  // Gera o hash Keccak-256 (bytes32 padrão no ecossistema Ethereum)
  const hash = web3.utils.sha3(texto);
  $("previewHashEntrega").textContent = hash;
}

function abrirModalDisputa(id) {
  modalProjetoId = id;
  $("percentualFreelancer").value = 50;
  atualizarPreviewDisputa();
  $("modalDisputa").hidden = false;
}

function fecharModalDisputa() {
  modalProjetoId = null;
  $("modalDisputa").hidden = true;
}

function atualizarPreviewDisputa() {
  const freeVal = parseInt($("percentualFreelancer").value || 0, 10);
  const clientVal = 100 - freeVal;
  $("previewDisputaSplit").textContent = `Freelancer: ${freeVal}% | Cliente: ${clientVal}%`;
}

// =========================================================================
// EVENTOS ON-CHAIN (FEED EM TEMPO REAL)
// =========================================================================

async function carregarEventos() {
  if (!contract) return;
  const feed = $("feedEventos");

  try {
    const eventos = await contract.getPastEvents("allEvents", {
      fromBlock: "earliest",
      toBlock: "latest",
    });

    if (!eventos || eventos.length === 0) {
      feed.innerHTML = `<div class="feed-empty">Nenhum evento registrado no contrato ainda.</div>`;
      return;
    }

    // Exibe os 10 eventos mais recentes
    const recentes = [...eventos].reverse().slice(0, 10);

    feed.innerHTML = recentes
      .map((ev) => {
        let classe = "info";
        let texto = ev.event;
        const vals = ev.returnValues;

        if (ev.event === "ProjetoCriado") {
          classe = "success";
          texto = `Projeto #${vals.id} criado pelo cliente ${vals.cliente.slice(0, 6)}... (${web3.utils.fromWei(vals.valor, "ether")} ETH)`;
        } else if (ev.event === "ProjetoAceito") {
          classe = "info";
          texto = `Projeto #${vals.id} aceito pelo freelancer ${vals.freelancer.slice(0, 6)}...`;
        } else if (ev.event === "ProjetoEntregue") {
          classe = "warn";
          texto = `Entrega submetida para o Projeto #${vals.id}`;
        } else if (ev.event === "ProjetoFinalizado") {
          classe = "success";
          texto = `Projeto #${vals.id} finalizado e pago ao freelancer!`;
        } else if (ev.event === "ProjetoCancelado") {
          classe = "danger";
          texto = `Projeto #${vals.id} cancelado pelo cliente`;
        } else if (ev.event === "DisputaAberta") {
          classe = "danger";
          texto = `Disputa aberta para o Projeto #${vals.id}`;
        } else if (ev.event === "TaxasSacadas") {
          classe = "info";
          texto = `Taxas da plataforma sacadas pelo administrador`;
        }

        return `
          <div class="event-entry ${classe}">
            <strong>${texto}</strong>
            <div class="event-meta">
              <span>Bloco #${ev.blockNumber}</span>
              <a href="${SEPOLIA_EXPLORER_TX}${ev.transactionHash}" target="_blank" rel="noopener">Etherscan ↗</a>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (e) {
    console.warn("Erro ao buscar eventos passados:", e);
    feed.innerHTML = `<div class="feed-empty">Eventos indisponíveis no nó RPC atual.</div>`;
  }
}

// =========================================================================
// EXECUTOR DE TRANSAÇÃO COM FEEDBACK E TRATAMENTO DE ERROS
// =========================================================================

/**
 * Executa uma transação de escrita gerenciando estados visuais
 */
async function executarTransacao(txPromessaFn, msgSucesso) {
  const link = $("txLink");
  link.hidden = true;
  link.href = "#";

  try {
    exibirStatus("⏳ Aguardando aprovação na MetaMask...", "pending");

    const promessa = txPromessaFn();

    // Feedback imediato quando a transação é transmitida para a rede
    promessa.on("transactionHash", (hash) => {
      exibirStatus(`Transação enviada! Aguardando mineração na Sepolia...`, "pending");
      link.href = `${SEPOLIA_EXPLORER_TX}${hash}`;
      link.hidden = false;
    });

    const receipt = await promessa;

    exibirStatus(`✅ ${msgSucesso}!`, "good", 8000);
    link.href = `${SEPOLIA_EXPLORER_TX}${receipt.transactionHash}`;
    link.hidden = false;

    await carregarSaldo();
    return receipt;
  } catch (err) {
    tratarErro(err, "Falha na transação");
  }
}

/**
 * Exibe mensagem no banner global de status
 */
function exibirStatus(mensagem, tipo = "neutral", duracaoMs = 0) {
  const banner = $("statusBanner");
  const msg = $("statusMessage");
  const icone = $("statusIcon");

  banner.className = `status-banner ${tipo}`;
  msg.textContent = mensagem;

  if (tipo === "good") icone.textContent = "✅";
  else if (tipo === "bad") icone.textContent = "❌";
  else if (tipo === "pending") icone.textContent = "⏳";
  else icone.textContent = "ℹ️";

  banner.hidden = false;

  if (duracaoMs > 0) {
    setTimeout(() => {
      if (banner.className.includes(tipo)) {
        banner.hidden = true;
      }
    }, duracaoMs);
  }
}

/**
 * Traduz e trata erros de forma compreensível para o usuário
 */
function tratarErro(err, contexto = "Erro") {
  console.error(`${contexto}:`, err);

  let mensagemAmigavel = err.message || "Erro desconhecido.";

  // Erro 4001: Usuário rejeitou na MetaMask
  if (err.code === 4001 || err.message?.includes("rejected")) {
    mensagemAmigavel = "Transação cancelada ou rejeitada pelo usuário na MetaMask.";
  } else if (err.code === -32002) {
    mensagemAmigavel = "Já existe uma solicitação pendente na MetaMask. Abra a extensão para confirmar.";
  } else if (err.message?.includes("insufficient funds") || err.message?.includes("gas required exceeds allowance")) {
    mensagemAmigavel = "Saldo insuficiente de SepoliaETH na carteira para cobrir o depósito e a taxa de gas.";
  } else if (err.message?.includes("AcessoNegado")) {
    mensagemAmigavel = "Acesso Negado: sua carteira não possui permissão para executar esta ação.";
  } else if (err.message?.includes("StatusIncorreto")) {
    mensagemAmigavel = "Status Incorreto: o projeto não está na fase necessária para esta operação.";
  } else if (err.message?.includes("ValorInvalido")) {
    mensagemAmigavel = "Valor Inválido: o montante de ETH deve ser maior que zero.";
  } else if (err.message?.includes("DadosInvalidos")) {
    mensagemAmigavel = "Dados Inválidos: verifique os campos informados.";
  }

  exibirStatus(`❌ ${contexto}: ${mensagemAmigavel}`, "bad", 8000);
}

/**
 * Validação básica de pré-requisitos antes de executar transações
 */
function validarConexao() {
  if (!contaConectada) {
    alert("Por favor, conecte sua MetaMask primeiro.");
    return false;
  }
  if (!redeSepoliaOk) {
    alert("Você deve estar conectado à rede Ethereum Sepolia.");
    verificarETrocarParaSepolia();
    return false;
  }
  if (!contract) {
    alert("Contrato não configurado em frontend/config.js. Insira o endereço após o deploy.");
    return false;
  }
  return true;
}

/**
 * Sanitiza texto para prevenir XSS ao injetar no DOM
 */
function escaparHTML(texto) {
  if (!texto) return "";
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
