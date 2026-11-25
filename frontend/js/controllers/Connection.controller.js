/**
 * Controlador de conexão com a MetaMask, rede Sepolia, saldo e reputação.
 */
export class ConnectionController {
  /**
   * @param {object} deps
   * @param {import("../services/Wallet.service.js").WalletService} deps.wallet
   * @param {import("../services/EscrowContract.service.js").EscrowContractService} deps.contract
   * @param {import("../ui/UIRenderer.js").UIRenderer} deps.ui
   * @param {import("../domain/AppState.js").AppState} deps.state
   * @param {() => Promise<void>} [deps.onSessionReady]
   * @param {() => void} [deps.onSessionCleared]
   */
  constructor({
    wallet,
    contract,
    ui,
    state,
    onSessionReady = null,
    onSessionCleared = null,
  }) {
    this.wallet = wallet;
    this.contract = contract;
    this.ui = ui;
    this.state = state;
    this.onSessionReady = onSessionReady;
    this.onSessionCleared = onSessionCleared;
  }

  async restoreAuthorizedSession() {
    this.wallet.ensureWeb3();
    const accounts = await this.wallet.getAuthorizedAccounts();
    if (accounts.length > 0) {
      await this.initSession(accounts[0]);
    }
  }

  async connect() {
    if (!this.wallet.isProviderAvailable()) {
      await this.ui.showAlertModal(
        "MetaMask não detectada. Instale a extensão no seu navegador.",
        "MetaMask Ausente"
      );
      return;
    }

    try {
      this.ui.showStatus("Solicitando autorização na MetaMask...", "pending");
      const accounts = await this.wallet.requestAccounts();
      if (accounts.length === 0) {
        this.ui.showStatus("Nenhuma conta selecionada.", "bad");
        return;
      }
      await this.initSession(accounts[0]);
    } catch (err) {
      console.error("Falha ao conectar MetaMask:", err);
      const msg = this.contract.parseErrorMessage(err);
      this.ui.showStatus(`❌ Falha ao conectar MetaMask: ${msg}`, "bad", 8000);
    }
  }

  async switchNetwork() {
    try {
      this.ui.showStatus(
        "Solicitando mudança para a rede Ethereum Sepolia...",
        "pending"
      );
      const ok = await this.wallet.switchToSepolia();
      if (ok && this.wallet.getAccount()) {
        await this.initSession(this.wallet.getAccount());
      } else {
        this.syncHeaderUI();
      }
    } catch (err) {
      console.error("Erro ao trocar para Sepolia:", err);
      const msg = this.contract.parseErrorMessage(err);
      this.ui.showStatus(
        `❌ Rede incorreta. Conecte-se à Ethereum Sepolia: ${msg}`,
        "bad",
        8000
      );
    }
  }

  async handleAccountsChanged(accounts) {
    if (!accounts || accounts.length === 0) {
      this.wallet.setAccount(null);
      this.syncHeaderUI();
      this.ui.setAdminPanelVisible(false);
      this.ui.showStatus("Carteira desconectada.", "neutral");
      if (typeof this.onSessionCleared === "function") {
        this.onSessionCleared();
      }
      return;
    }

    await this.initSession(accounts[0]);
  }

  async initSession(account) {
    this.wallet.setAccount(account);
    this.wallet.ensureWeb3();

    try {
      await this.wallet.switchToSepolia();
    } catch (err) {
      console.error("Falha ao verificar rede Sepolia:", err);
      const msg = this.contract.parseErrorMessage(err);
      this.ui.showStatus(
        `❌ Rede incorreta. Conecte-se à Ethereum Sepolia: ${msg}`,
        "bad",
        8000
      );
    }

    this.syncHeaderUI();

    if (!this.wallet.isConnectedToSepolia()) {
      return;
    }

    this.ui.showStatus(
      "Conectado com sucesso à Ethereum Sepolia.",
      "good",
      3000
    );

    await this.refreshWalletMetrics();

    if (this.contract.isAddressConfigured()) {
      try {
        const owner = await this.contract.getOwner();
        this.state.setContractOwner(owner);
      } catch (e) {
        console.warn("Não foi possível carregar dono do contrato:", e);
      }

      this.ui.setAdminPanelVisible(this.state.isOwner(account));

      if (typeof this.onSessionReady === "function") {
        await this.onSessionReady();
      }
    }
  }

  syncHeaderUI() {
    this.ui.renderNetworkState({
      isConnected: Boolean(this.wallet.getAccount()),
      isSepoliaOk: this.wallet.isConnectedToSepolia(),
      account: this.wallet.getAccount(),
    });
  }

  async refreshWalletMetrics() {
    const account = this.wallet.getAccount();
    if (!account) return;

    try {
      const balanceEth = await this.wallet.getFormattedBalance(4);
      this.ui.renderWalletBalance(balanceEth);
    } catch (e) {
      console.error("Erro ao carregar saldo:", e);
    }

    if (this.contract.getContract()) {
      try {
        const rep = await this.contract.getUserReputation(account);
        this.ui.renderUserReputation(rep);
      } catch (e) {
        console.warn("Não foi possível carregar reputação:", e);
      }
    }
  }
}