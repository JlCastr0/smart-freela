/**
 * Controlador de disputas e ações administrativas de governança (owner).
 */
export class DisputeController {
  /**
   * @param {object} deps
   * @param {import("../services/EscrowContract.service.js").EscrowContractService} deps.contract
   * @param {import("../ui/UIRenderer.js").UIRenderer} deps.ui
   * @param {import("../domain/AppState.js").AppState} deps.state
   * @param {import("../domain/ProjectValidator.js").ProjectValidator} deps.validator
   * @param {import("../infra/txRunner.js").TxRunner} deps.txRunner
   */
  constructor({ contract, ui, state, validator, txRunner }) {
    this.contract = contract;
    this.ui = ui;
    this.state = state;
    this.validator = validator;
    this.txRunner = txRunner;
  }

  openResolveModal(projectId) {
    this.ui.openDisputeModal(projectId);
  }

  updateSplitPreview(rawPercentage) {
    this.ui.updateDisputeSplitPreview(parseInt(rawPercentage || "0", 10));
  }

  async openDispute(projectId) {
    if (!(await this.txRunner.ensureReady())) return;

    const confirmed = await this.ui.showConfirmModal({
      title: "⚖️ Abrir Disputa Oficial",
      message:
        "Deseja abrir uma disputa para este projeto? Os fundos ficarão travados no contrato até a mediação do administrador.",
      confirmText: "Abrir Disputa",
      variant: "danger",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) => this.contract.openDispute(projectId, callbacks),
      `Disputa aberta para o projeto #${projectId}. Aguarde a mediação.`
    );
  }

  async resolveDispute() {
    if (!(await this.txRunner.ensureReady())) return;

    const modalState = this.ui.getDisputeModalState();
    const validation = this.validator.validateDisputeResolution(modalState);

    if (!validation.valid) {
      await this.ui.showAlertModal(validation.error, validation.title);
      return;
    }

    const { projectId, freelancerPercentage } = validation.data;
    this.ui.closeDisputeModal();

    await this.txRunner.run(
      (callbacks) =>
        this.contract.resolveDispute(
          projectId,
          freelancerPercentage,
          callbacks
        ),
      `Disputa do projeto #${projectId} resolvida com sucesso (${freelancerPercentage}% freelancer)`
    );
  }

  async withdrawFees() {
    if (!(await this.txRunner.ensureReady())) return;

    const confirmed = await this.ui.showConfirmModal({
      title: "💰 Sacar Taxas Acumuladas",
      message:
        "Deseja transferir todo o saldo de taxas acumuladas da plataforma para a carteira do administrador?",
      confirmText: "Sacar Taxas",
      variant: "primary",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) => this.contract.withdrawFees(callbacks),
      "Taxas da plataforma sacadas com sucesso para a carteira do dono"
    );
  }

  async toggleContractActive() {
    if (!(await this.txRunner.ensureReady())) return;

    const isActive = this.state.isContractActive;
    const actionText = isActive ? "pausar" : "reativar";

    const confirmed = await this.ui.showConfirmModal({
      title: "🛡️ Alterar Status Operacional (Circuit Breaker)",
      message: `Deseja realmente ${actionText} a criação de novos projetos no contrato inteligente?`,
      confirmText: isActive ? "Pausar Contrato" : "Reativar Contrato",
      variant: isActive ? "danger" : "primary",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) => this.contract.toggleContractActive(callbacks),
      "Status operacional do contrato atualizado com sucesso"
    );
  }
}