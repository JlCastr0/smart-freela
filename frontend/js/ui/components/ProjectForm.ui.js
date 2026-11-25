/**
 * Componente do formulário de publicação de novos projetos em caução.
 */
export class ProjectFormUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
  }

  getValues() {
    return {
      title: this.dom.$("projectTitle")?.value.trim() || "",
      description: this.dom.$("projectDescription")?.value.trim() || "",
      dueDateInput: this.dom.$("projectDueDate")?.value || "",
      amountEth: this.dom.$("projectAmount")?.value.trim() || "",
    };
  }

  reset() {
    this.dom.$("formCreateProject")?.reset();
  }

  setContractActiveState(isContractActive) {
    const createBtn = this.dom.$("btnCreateProject");
    if (!createBtn) return;

    createBtn.disabled = !isContractActive;
    createBtn.textContent = isContractActive
      ? "🔒 Criar Projeto & Bloquear ETH"
      : "⏸️ Criação Pausada pelo Admin";
  }
}