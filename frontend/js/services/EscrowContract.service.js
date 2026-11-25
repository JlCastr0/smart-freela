import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contract.js";
import { ABI_META } from "../infra/abiMeta.js";
import {
  EVENTS_FEED_LIMIT,
  ZERO_BYTES32,
  EVENTS_LOOKBACK_BLOCKS
} from "../config/domain.js";

const CUSTOM_ERROR_MESSAGES = {
  AccessDenied:
    "Acesso Negado: sua carteira não possui permissão para executar esta ação.",
  ContractPaused:
    "Contrato Pausado: novas criações de projetos estão temporariamente suspensas.",
  DeadlineNotExpired:
    "O prazo de entrega ainda não expirou para permitir cancelamento unilateral.",
  IncorrectStatus:
    "Status Incorreto: o projeto não está na fase necessária para esta operação.",
  InvalidAmount:
    "Valor Inválido: o montante de ETH deve ser maior que zero.",
  InvalidData:
    "Dados Inválidos: verifique os campos informados ou a integridade do hash.",
  InvalidPercentage:
    "Percentual Inválido: o percentual deve estar entre 0 e 100.",
  PaymentFailed:
    "Falha no Pagamento: a transferência de ETH não foi concluída pelo contrato.",
  ProjectNotFound:
    "Projeto Não Encontrado: o identificador informado não existe no contrato.",
};

/**
 * Serviço responsável pela comunicação Web3.js com o contrato inteligente SmartFreela,
 * apoiado em metadados derivados da ABI (ABI_META) para reduzir acoplamento.
 */
export class EscrowContractService {
  /**
   * @param {import("./Wallet.service.js").WalletService} walletService
   * @param {object} abiMeta
   */
  constructor(walletService, abiMeta = ABI_META) {
    this.walletService = walletService;
    this.abiMeta = abiMeta;
    this.contract = null;
  }

  /**
   * Verifica se CONTRACT_ADDRESS foi devidamente preenchido.
   */
  isAddressConfigured() {
    return Boolean(
      CONTRACT_ADDRESS &&
        typeof CONTRACT_ADDRESS === "string" &&
        !CONTRACT_ADDRESS.includes("COLOQUE_O_ENDERECO") &&
        CONTRACT_ADDRESS.startsWith("0x")
    );
  }

  /**
   * Retorna (ou inicializa) a instância do contrato Web3.
   */
  getContract() {
    const web3 = this.walletService.getWeb3();
    if (!web3 || !this.isAddressConfigured()) {
      return null;
    }
    if (!this.contract) {
      this.contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    }
    return this.contract;
  }

  /**
   * Garante que o contrato está instanciado e que a função existe na ABI atual.
   */
  _resolveFunction(methodName, args = []) {
    const contract = this.getContract();
    if (!contract) {
      throw new Error(
        "Contrato não configurado em frontend/js/config/contract.js."
      );
    }

    const fnMeta = this.abiMeta?.functions?.[methodName];
    if (!fnMeta) {
      throw new Error(
        `Função "${methodName}" não encontrada na ABI atual do contrato.`
      );
    }

    const methodBuilder = contract.methods[methodName];
    if (typeof methodBuilder !== "function") {
      throw new Error(
        `Método "${methodName}" indisponível na instância do contrato.`
      );
    }

    return {
      fnMeta,
      callBuilder: methodBuilder(...args),
    };
  }

  /**
   * Executa uma chamada de leitura (.call) validada pela ABI.
   */
  async callMethod(methodName, args = []) {
    const { callBuilder } = this._resolveFunction(methodName, args);
    return callBuilder.call();
  }

  /**
   * Executa uma transação de escrita (.send) validada pela ABI.
   */
  async sendMethod(
    methodName,
    args = [],
    { valueWei = null } = {},
    { onHash, onReceipt } = {}
  ) {
    const account = this.walletService.getAccount();
    if (!account) {
      throw new Error("Nenhuma carteira conectada.");
    }

    const { fnMeta, callBuilder } = this._resolveFunction(methodName, args);

    if (valueWei !== null && valueWei !== undefined && !fnMeta.isPayable) {
      throw new Error(
        `A função "${methodName}" não é payable e não aceita envio de ETH.`
      );
    }

    const txOptions = { from: account };
    if (fnMeta.isPayable && valueWei !== null && valueWei !== undefined) {
      txOptions.value = valueWei;
    }

    const txPromise = callBuilder.send(txOptions);

    if (typeof onHash === "function") {
      txPromise.on("transactionHash", (hash) => onHash(hash));
    }

    const receipt = await txPromise;

    if (typeof onReceipt === "function") {
      onReceipt(receipt);
    }

    return receipt;
  }

  /**
   * Normaliza o retorno de um projeto com base nos campos derivados da ABI
   * (suporta tanto objetos nomeados quanto arrays posicionais do Web3.js).
   */
  _normalizeProject(rawProject) {
    if (!rawProject || typeof rawProject !== "object") {
      return rawProject;
    }

    const fields = this.abiMeta?.projectStructFields || [];
    if (fields.length === 0) {
      return rawProject;
    }

    const normalized = { ...rawProject };
    fields.forEach((field, idx) => {
      if (!field?.name) return;
      if (normalized[field.name] === undefined && rawProject[idx] !== undefined) {
        normalized[field.name] = rawProject[idx];
      }
    });

    return normalized;
  }

  /**
   * Converte um valor em ETH para wei utilizando Web3.utils.
   */
  toWei(ethValue) {
    const web3 = this.walletService.getWeb3();
    if (!web3) {
      throw new Error("Instância Web3 indisponível.");
    }
    return web3.utils.toWei(String(ethValue), "ether");
  }

  /**
   * Converte um valor em wei para ETH formatado.
   */
  fromWei(weiValue, decimals = null) {
    const web3 = this.walletService.getWeb3();
    if (!web3) {
      return "0";
    }
    const ethStr = web3.utils.fromWei(weiValue, "ether");
    if (typeof decimals === "number") {
      const parsed = parseFloat(ethStr);
      return Number.isNaN(parsed) ? "0" : parsed.toFixed(decimals);
    }
    return ethStr;
  }

  /**
   * Gera o hash Keccak-256 (bytes32) correspondente a keccak256(bytes(url)) no Solidity.
   */
  computeDeliveryHash(deliveryUrl) {
    const web3 = this.walletService.getWeb3();
    const cleanText = String(deliveryUrl || "").trim();
    if (!cleanText || !web3) {
      return ZERO_BYTES32;
    }
    return web3.utils.keccak256(cleanText);
  }

  // =========================================================================
  // LEITURAS ON-CHAIN (.call)
  // =========================================================================

  async getOwner() {
    return this.callMethod("owner");
  }

  async isContractActive() {
    const active = await this.callMethod("isActive");
    return Boolean(active);
  }

  async getAccumulatedFeesEth(decimals = 4) {
    const feesWei = await this.callMethod("accumulatedFees");
    return this.fromWei(feesWei, decimals);
  }

  async getUserReputation(userAddress) {
    const rep = await this.callMethod("getUserReputation", [userAddress]);
    return rep.toString();
  }

  async getTotalProjects() {
    const total = await this.callMethod("totalProjects");
    return Number(total);
  }

  async getProject(projectId) {
    const raw = await this.callMethod("getProject", [projectId]);
    return this._normalizeProject(raw);
  }

  /**
   * Busca todos os projetos existentes e os ordena do mais recente para o mais antigo.
   */
  async getAllProjectsOrdered() {
    const totalNum = await this.getTotalProjects();
    const projects = [];

    for (let i = 1; i <= totalNum; i++) {
      try {
        const project = await this.getProject(i);
        projects.push(project);
      } catch (err) {
        console.warn(`Erro ao carregar projeto #${i}:`, err);
      }
    }

    return projects.reverse();
  }

  /**
   * Busca os eventos recentes do contrato respeitando o limite de blocos da rede Sepolia.
   */
  async getRecentEvents(
    lookbackBlocks = EVENTS_LOOKBACK_BLOCKS,
    limit = EVENTS_FEED_LIMIT
  ) {
    const contract = this.getContract();
    const web3 = this.walletService.getWeb3();

    if (!contract || !web3) {
      throw new Error(
        "Contrato ou instância Web3 não inicializados para leitura de eventos."
      );
    }

    const currentBlock = await web3.eth.getBlockNumber();
    const fromBlock =
      currentBlock > lookbackBlocks ? currentBlock - lookbackBlocks : 0n;

    const events = await contract.getPastEvents("allEvents", {
      fromBlock,
      toBlock: "latest",
    });

    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    return [...events].reverse().slice(0, limit);
  }

  // =========================================================================
  // ESCRITAS ON-CHAIN (.send)
  // =========================================================================

  createProject({ title, description, dueDateTimestamp, amountEth }, callbacks) {
    const amountWei = this.toWei(amountEth);
    return this.sendMethod(
      "createProject",
      [title, description, dueDateTimestamp],
      { valueWei: amountWei },
      callbacks
    );
  }

  acceptProject(projectId, callbacks) {
    return this.sendMethod("acceptProject", [projectId], {}, callbacks);
  }

  deliverProject(projectId, deliveryUrl, deliveryHash, callbacks) {
    return this.sendMethod(
      "deliverProject",
      [projectId, deliveryUrl, deliveryHash],
      {},
      callbacks
    );
  }

  approveAndComplete(projectId, callbacks) {
    return this.sendMethod("approveAndComplete", [projectId], {}, callbacks);
  }

  cancelProject(projectId, callbacks) {
    return this.sendMethod("cancelProject", [projectId], {}, callbacks);
  }

  openDispute(projectId, callbacks) {
    return this.sendMethod("openDispute", [projectId], {}, callbacks);
  }

  resolveDispute(projectId, freelancerPercentage, callbacks) {
    return this.sendMethod(
      "resolveDispute",
      [projectId, freelancerPercentage],
      {},
      callbacks
    );
  }

  withdrawFees(callbacks) {
    return this.sendMethod("withdrawFees", [], {}, callbacks);
  }

  toggleContractActive(callbacks) {
    return this.sendMethod("toggleContractActive", [], {}, callbacks);
  }

  // =========================================================================
  // TRATAMENTO DE ERROS
  // =========================================================================

  /**
   * Converte erros de RPC, MetaMask ou erros customizados da ABI em mensagens claras.
   */
  parseErrorMessage(err) {
    if (!err) {
      return "Erro desconhecido.";
    }

    const msg = err.message || "";

    if (err.code === 4001 || msg.toLowerCase().includes("rejected")) {
      return "Transação cancelada ou rejeitada pelo usuário na MetaMask.";
    }
    if (err.code === -32002) {
      return "Já existe uma solicitação pendente na MetaMask. Abra a extensão para confirmar.";
    }
    if (
      msg.includes("insufficient funds") ||
      msg.includes("gas required exceeds allowance")
    ) {
      return "Saldo insuficiente de SepoliaETH na carteira para cobrir o valor e a taxa de gas.";
    }

    const knownErrors = this.abiMeta?.errors || {};
    for (const errorName of Object.keys(knownErrors)) {
      if (msg.includes(errorName)) {
        return (
          CUSTOM_ERROR_MESSAGES[errorName] ||
          `Reversão do contrato por erro personalizado: ${errorName}.`
        );
      }
    }

    return msg || "Erro desconhecido.";
  }
}