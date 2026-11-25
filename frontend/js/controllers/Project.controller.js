/**
 * Controlador de ciclo de vida de projetos e submissão de entregas (delivery).
 */
export class ProjectController {
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

  updateDeliveryHashPreview(rawDeliveryUrl) {
    const hash = this.contract.computeDeliveryHash(rawDeliveryUrl);
    this.ui.updateDeliveryHashPreview(hash);
  }

  openDeliveryModal(projectId) {
    this.ui.openDeliveryModal(projectId);
  }

  async createProject() {
    if (!(await this.txRunner.ensureReady())) return;

    const formValues = this.ui.getCreateProjectFormValues();
    const validation = this.validator.validateCreateProject(formValues, {
      isContractActive: this.state.isContractActive,
    });

    if (!validation.valid) {
      await this.ui.showAlertModal(validation.error);
      return;
    }

    const receipt = await this.txRunner.run(
      (callbacks) => this.contract.createProject(validation.data, callbacks),
      "Projeto publicado e ETH retido em caução com sucesso"
    );

    if (receipt) {
      this.ui.resetCreateProjectForm();
    }
  }

  async acceptProject(projectId) {
    if (!(await this.txRunner.ensureReady())) return;

    await this.txRunner.run(
      (callbacks) => this.contract.acceptProject(projectId, callbacks),
      `Projeto #${projectId} aceito com sucesso`
    );
  }

  async cancelProject(projectId, isLateCancel = false) {
    if (!(await this.txRunner.ensureReady())) return;

    const confirmed = await this.ui.showConfirmModal({
      title: isLateCancel
        ? "⏰ Cancelar Projeto por Atraso"
        : "❌ Cancelar Demanda",
      message: isLateCancel
        ? "O prazo de entrega expirou. Deseja cancelar o projeto por atraso, recuperar 100% do seu ETH e aplicar penalidade de reputação (-15 pts) ao freelancer?"
        : "Deseja realmente cancelar este projeto aberto e receber 100% do seu ETH de volta?",
      confirmText: "Sim, Cancelar e Reembolsar",
      variant: "danger",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) => this.contract.cancelProject(projectId, callbacks),
      `Projeto #${projectId} cancelado e ETH reembolsado com sucesso`
    );
  }

  async submitDelivery() {
    if (!(await this.txRunner.ensureReady())) return;

    const modalState = this.ui.getDeliveryModalState();
    const validation = this.validator.validateDelivery(modalState);

    if (!validation.valid) {
      await this.ui.showAlertModal(validation.error, validation.title);
      return;
    }

    const { projectId, deliveryUrl, deliveryHash } = validation.data;
    this.ui.closeDeliveryModal();

    await this.txRunner.run(
      (callbacks) =>
        this.contract.deliverProject(
          projectId,
          deliveryUrl,
          deliveryHash,
          callbacks
        ),
      `Entrega do projeto #${projectId} (URL + Hash bytes32) registrada na blockchain`
    );
  }

  async approveAndComplete(projectId) {
    if (!(await this.txRunner.ensureReady())) return;

    const confirmed = await this.ui.showConfirmModal({
      title: "✅ Aprovar Entrega e Liberar Pagamento",
      message:
        "Você já auditou o link de entrega? Ao confirmar, 98% do valor em custódia serão transferidos ao freelancer (2% de taxa da plataforma) e ele receberá +10 pontos de reputação.",
      confirmText: "Aprovar & Pagar Freelancer",
      variant: "primary",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) => this.contract.approveAndComplete(projectId, callbacks),
      `Projeto #${projectId} aprovado! Pagamento liberado e reputação do freelancer bonificada (+10 pts)`
    );
  }

  async claimAfterReviewTimeout(projectId) {
    if (!(await this.txRunner.ensureReady())) return;

    const confirmed = await this.ui.showConfirmModal({
      title: "⏳ Resgatar Pagamento Após Prazo de Revisão",
      message:
        "O prazo de revisão de 7 dias após a entrega expirou sem aprovação ou disputa do cliente. Deseja concluir o projeto, receber o valor líquido (com 2% de taxa da plataforma) e registrar +10 pts de reputação?",
      confirmText: "Resgatar Pagamento",
      variant: "primary",
    });

    if (!confirmed) return;

    await this.txRunner.run(
      (callbacks) =>
        this.contract.claimAfterReviewTimeout(projectId, callbacks),
      `Pagamento do projeto #${projectId} resgatado com sucesso após expiração do prazo de revisão`
    );
  }
}