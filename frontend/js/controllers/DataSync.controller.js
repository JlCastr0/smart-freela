/**
 * Controlador de sincronização de dados on-chain:
 * projetos, contadores/filtros do mural, estado operacional/admin e feed de eventos.
 */
export class DataSyncController {
  /**
   * @param {object} deps
   * @param {import("../services/Wallet.service.js").WalletService} deps.wallet
   * @param {import("../services/EscrowContract.service.js").EscrowContractService} deps.contract
   * @param {import("../ui/UIRenderer.js").UIRenderer} deps.ui
   * @param {import("../domain/AppState.js").AppState} deps.state
   * @param {() => Promise<void>} [deps.onRefreshWalletMetrics]
   */
  constructor({
    wallet,
    contract,
    ui,
    state,
    onRefreshWalletMetrics = null,
  }) {
    this.wallet = wallet;
    this.contract = contract;
    this.ui = ui;
    this.state = state;
    this.onRefreshWalletMetrics = onRefreshWalletMetrics;
  }

  async refreshAll({ force = false, retryDelayMs = 0 } = {}) {
    if (!this.contract.getContract()) return;
    if (this.state.isRefreshing && !force) return;

    this.state.isRefreshing = true;
    try {
      const tasks = [
        this.loadProjects(),
        this.loadOperationalState(),
        this.loadEvents(),
      ];

      if (typeof this.onRefreshWalletMetrics === "function") {
        tasks.push(this.onRefreshWalletMetrics());
      }

      await Promise.allSettled(tasks);
    } finally {
      this.state.isRefreshing = false;
    }

    if (retryDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      this.state.isRefreshing = true;
      try {
        await Promise.allSettled([
          this.loadProjects(),
          typeof this.onRefreshWalletMetrics === "function"
            ? this.onRefreshWalletMetrics()
            : Promise.resolve(),
        ]);
      } finally {
        this.state.isRefreshing = false;
      }
    }
  }

  async loadProjects() {
    if (!this.state.loadedProjects || this.state.loadedProjects.length === 0) {
      this.ui.renderProjectsLoading("Consultando smart contract na Sepolia...");
    }

    try {
      const projects = await this.contract.getAllProjectsOrdered();
      this.state.setProjects(projects);
      this.renderBoard();
    } catch (err) {
      if (!this.state.loadedProjects || this.state.loadedProjects.length === 0) {
        this.ui.renderProjectsEmpty(
          `Erro ao consultar projetos: ${err.message || "Falha RPC"}`
        );
      } else {
        console.warn("Falha transitória ao atualizar projetos:", err);
        this.renderBoard();
      }
    }
  }

  changeFilter(filterName) {
    const cleanFilter = filterName || "all";
    this.state.setFilter(cleanFilter);
    this.ui.setActiveFilterTab(cleanFilter);
    this.renderBoard();
  }

  renderBoard() {
    const account = this.wallet.getAccount();
    const counters = this.state.getCounters(account);
    this.ui.renderProjectCounters(counters);

    const filtered = this.state.getFilteredProjects(account);
    if (filtered === null) {
      this.ui.renderProjectsEmpty(
        "Conecte sua carteira para ver seus projetos."
      );
      return;
    }

    this.ui.renderProjectsList(filtered, {
      connectedAccount: account,
      contractOwner: this.state.contractOwner,
      formatWeiToEth: (wei) => this.contract.fromWei(wei),
    });
  }

  async loadOperationalState() {
    try {
      const isActive = await this.contract.isContractActive();
      this.state.setContractActive(isActive);

      let accumulatedFeesEth;
      if (this.state.isOwner(this.wallet.getAccount())) {
        accumulatedFeesEth = await this.contract.getAccumulatedFeesEth(4);
      }

      this.ui.renderContractOperationalState({
        isContractActive: isActive,
        accumulatedFeesEth,
      });
    } catch (e) {
      console.error("Erro ao carregar estado operacional:", e);
    }
  }

  async loadEvents() {
    try {
      const events = await this.contract.getRecentEvents();
      this.ui.renderEventsFeed(events, (wei) => this.contract.fromWei(wei));
    } catch (e) {
      console.warn("Erro ao buscar eventos passados:", e);
      this.ui.renderEventsFeedEmpty(
        "Eventos indisponíveis no nó RPC atual."
      );
    }
  }
}