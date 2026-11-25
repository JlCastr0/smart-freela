/**
 * Componente do Painel Administrativo (visível apenas para o dono do contrato).
 */
export class AdminPanelUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
  }

  setVisible(visible) {
    const cardAdmin = this.dom.$("cardAdmin");
    if (cardAdmin) cardAdmin.hidden = !visible;
  }

  renderOperationalState({ isContractActive, accumulatedFeesEth }) {
    const feesEl = this.dom.$("adminFees");
    if (feesEl && accumulatedFeesEth !== undefined) {
      feesEl.textContent = `${accumulatedFeesEth} ETH`;
    }

    const statusEl = this.dom.$("adminContractStatus");
    const toggleBtn = this.dom.$("btnToggleContract");
    if (statusEl && toggleBtn) {
      statusEl.textContent = isContractActive
        ? "Ativo (Operacional)"
        : "Pausado (Circuit Breaker)";
      toggleBtn.textContent = isContractActive
        ? "⏸️ Pausar Novas Criações"
        : "▶️ Reativar Contrato";
    }
  }
}