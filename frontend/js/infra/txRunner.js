/**
 * Executor centralizado de transações on-chain.
 * Garante pré-condições de conexão/rede/contrato, exibe estados visuais no banner,
 * propaga hash do Etherscan, trata erros e dispara sincronização pós-transação.
 */
export class TxRunner {
  /**
   * @param {object} deps
   * @param {import("../services/Wallet.service.js").WalletService} deps.wallet
   * @param {import("../services/EscrowContract.service.js").EscrowContractService} deps.contract
   * @param {import("../ui/UIRenderer.js").UIRenderer} deps.ui
   * @param {() => Promise<void>} [deps.onAfterSuccess]
   * @param {() => Promise<void>} [deps.onSwitchNetwork]
   */
  constructor({
    wallet,
    contract,
    ui,
    onAfterSuccess = null,
    onSwitchNetwork = null,
  }) {
    this.wallet = wallet;
    this.contract = contract;
    this.ui = ui;
    this.onAfterSuccess = onAfterSuccess;
    this.onSwitchNetwork = onSwitchNetwork;
  }

  /**
   * Valida se a carteira, a rede Sepolia e o contrato estão prontos para transação.
   */
  async ensureReady() {
    const check = this.validateConnection({
      walletService: this.wallet,
      contractService: this.contract,
    });

    if (!check.valid) {
      await this.ui.showAlertModal(check.error);
      if (
        check.action === "switch-network" &&
        typeof this.onSwitchNetwork === "function"
      ) {
        await this.onSwitchNetwork();
      }
      return false;
    }

    return true;
  }

  validateConnection({ walletService, contractService }) {
    if (!walletService.getAccount()) {
      return {
        valid: false,
        error: "Por favor, conecte sua carteira MetaMask primeiro.",
        action: "connect",
      };
    }

    if (!walletService.isConnectedToSepolia()) {
      return {
        valid: false,
        error: "Você deve estar conectado à rede Ethereum Sepolia.",
        action: "switch-network",
      };
    }

    if (!contractService.isAddressConfigured() || !contractService.getContract()) {
      return {
        valid: false,
        error:
          "Contrato não configurado em frontend/js/config/contract.js. Insira o endereço após o deploy.",
      };
    }

    return { valid: true };
  }

  /**
   * Formata e exibe erros de transação/RPC/contrato no banner de status.
   */
  handleError(err, context = "Erro") {
    console.error(`${context}:`, err);
    const friendlyMsg = this.contract.parseErrorMessage(err);
    this.ui.showStatus(`❌ ${context}: ${friendlyMsg}`, "bad", 8000);
  }

  /**
   * Executa uma transação assíncrona com feedback de progresso, recibo e refresh de dados.
   */
  async run(txExecutor, successMessage, { errorContext = "Falha na transação" } = {}) {
    this.ui.setTransactionLink(null);

    try {
      this.ui.showStatus("⏳ Aguardando aprovação na MetaMask...", "pending");

      const receipt = await txExecutor({
        onHash: (hash) => {
          this.ui.showStatus(
            "Transação enviada! Aguardando mineração na Sepolia...",
            "pending"
          );
          this.ui.setTransactionLink(hash);
        },
      });

      this.ui.showStatus(`✅ ${successMessage}!`, "good", 8000);

      if (receipt?.transactionHash) {
        this.ui.setTransactionLink(receipt.transactionHash);
      }

      if (typeof this.onAfterSuccess === "function") {
        await this.onAfterSuccess();
      }

      return receipt;
    } catch (err) {
      this.handleError(err, errorContext);
      return null;
    }
  }
}