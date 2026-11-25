import { WalletService } from "./services/Wallet.service.js";
import { EscrowContractService } from "./services/EscrowContract.service.js";
import { UIRenderer } from "./ui/UIRenderer.js";
import { AppState } from "./domain/AppState.js";
import { ProjectValidator } from "./domain/ProjectValidator.js";
import { TxRunner } from "./infra/txRunner.js";
import { ConnectionController } from "./controllers/Connection.controller.js";
import { DataSyncController } from "./controllers/DataSync.controller.js";
import { ProjectController } from "./controllers/Project.controller.js";
import { DisputeController } from "./controllers/Dispute.controller.js";

/**
 * Ponto de composição e despacho de eventos da dApp SmartFreela.
 */
export class SmartFreelaBootstrap {
  constructor() {
    this.wallet = new WalletService();
    this.contract = new EscrowContractService(this.wallet);
    this.ui = new UIRenderer();
    this.state = new AppState();
    this.validator = new ProjectValidator();

    this.connectionCtrl = new ConnectionController({
      wallet: this.wallet,
      contract: this.contract,
      ui: this.ui,
      state: this.state,
      onSessionReady: () => this.dataSyncCtrl.refreshAll(),
      onSessionCleared: () => this.dataSyncCtrl.renderBoard(),
    });

    this.dataSyncCtrl = new DataSyncController({
      wallet: this.wallet,
      contract: this.contract,
      ui: this.ui,
      state: this.state,
      onRefreshWalletMetrics: () =>
        this.connectionCtrl.refreshWalletMetrics(),
    });

    this.txRunner = new TxRunner({
      wallet: this.wallet,
      contract: this.contract,
      ui: this.ui,
      onAfterSuccess: () => this.dataSyncCtrl.refreshAll({ force: true, retryDelayMs: 900 }),
      onSwitchNetwork: () => this.connectionCtrl.switchNetwork(),
    });

    const controllerDeps = {
      contract: this.contract,
      ui: this.ui,
      state: this.state,
      validator: this.validator,
      txRunner: this.txRunner,
    };

    this.projectCtrl = new ProjectController(controllerDeps);
    this.disputeCtrl = new DisputeController(controllerDeps);
  }

  async init() {
    this.ui.setContractWarningVisible(!this.contract.isAddressConfigured());
    this.bindEvents();

    if (!this.wallet.isProviderAvailable()) {
      this.ui.showStatus(
        "MetaMask não encontrada. Por favor, instale a extensão MetaMask.",
        "bad"
      );
      return;
    }

    await this.connectionCtrl.restoreAuthorizedSession();

    this.wallet.subscribeEvents({
      onAccountsChanged: (accounts) =>
        this.connectionCtrl.handleAccountsChanged(accounts),
      onChainChanged: () => window.location.reload(),
    });
  }

  bindEvents() {
    const connectBtn = this.ui.$("connectBtn");
    if (connectBtn) {
      connectBtn.addEventListener("click", () => {
        if (connectBtn.dataset.action === "switch-network") {
          this.connectionCtrl.switchNetwork();
        } else {
          this.connectionCtrl.connect();
        }
      });
    }

    // Formulário e ações de projeto / entrega
    this.ui
      .$("btnCreateProject")
      ?.addEventListener("click", () => this.projectCtrl.createProject());

    this.ui
      .$("btnConfirmDelivery")
      ?.addEventListener("click", () => this.projectCtrl.submitDelivery());

    this.ui.$("deliveryText")?.addEventListener("input", (e) => {
      this.projectCtrl.updateDeliveryHashPreview(e.target.value);
    });

    // Disputas e governança admin
    this.ui
      .$("btnWithdrawFees")
      ?.addEventListener("click", () => this.disputeCtrl.withdrawFees());

    this.ui
      .$("btnToggleContract")
      ?.addEventListener("click", () => this.disputeCtrl.toggleContractActive());

    this.ui
      .$("btnConfirmResolution")
      ?.addEventListener("click", () => this.disputeCtrl.resolveDispute());

    this.ui.$("freelancerPercentage")?.addEventListener("input", (e) => {
      this.disputeCtrl.updateSplitPreview(e.target.value);
    });

    // Sincronização manual e filtros do mural
    this.ui
      .$("btnRefresh")
      ?.addEventListener("click", () => this.dataSyncCtrl.refreshAll());

    document.querySelectorAll(".filter-tabs .tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        this.dataSyncCtrl.changeFilter(tab.dataset.filter || "all");
      });
    });

    // Delegação de ações nos cards dinâmicos de projeto
    this.ui.$("listProjects")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;

      this.dispatchCardAction(
        btn.dataset.action,
        btn.dataset.projectId,
        btn.dataset.late === "true"
      );
    });

    // Fechamento de modais via [data-close-modal]
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-close-modal]");
      if (!trigger) return;

      if (trigger.dataset.closeModal === "modalDelivery") {
        this.ui.closeDeliveryModal();
      } else if (trigger.dataset.closeModal === "modalDispute") {
        this.ui.closeDisputeModal();
      }
    });
  }

  async dispatchCardAction(action, projectId, isLate) {
    switch (action) {
      case "accept-project":
        await this.projectCtrl.acceptProject(projectId);
        break;
      case "cancel-project":
        await this.projectCtrl.cancelProject(projectId, isLate);
        break;
      case "open-delivery-modal":
        this.projectCtrl.openDeliveryModal(projectId);
        break;
      case "approve-project":
        await this.projectCtrl.approveAndComplete(projectId);
        break;
      case "open-dispute":
        await this.disputeCtrl.openDispute(projectId);
        break;
      case "open-resolve-modal":
        this.disputeCtrl.openResolveModal(projectId);
        break;
      default:
        break;
    }
  }
}