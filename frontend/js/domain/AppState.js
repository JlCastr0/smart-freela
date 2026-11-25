/**
 * Gerenciamento centralizado de estado da dApp, filtros e contadores do mural.
 */
export class AppState {
  constructor() {
    this.contractOwner = null;
    this.isContractActive = true;
    this.loadedProjects = [];
    this.currentFilter = "all"; // "all" | "open" | "mine"
    this.isRefreshing = false;
  }

  setContractOwner(ownerAddress) {
    this.contractOwner = ownerAddress || null;
  }

  setContractActive(active) {
    this.isContractActive = Boolean(active);
  }

  setProjects(projects) {
    this.loadedProjects = Array.isArray(projects) ? projects : [];
  }

  setFilter(filterName) {
    this.currentFilter = filterName || "all";
  }

  /**
   * Verifica se a conta informada corresponde ao dono (owner) do contrato.
   */
  isOwner(account) {
    if (!this.contractOwner || !account) return false;
    return this.contractOwner.toLowerCase() === account.toLowerCase();
  }

  /**
   * Calcula os contadores para as abas do mural.
   */
  getCounters(account) {
    const all = this.loadedProjects.length;
    const open = this.loadedProjects.filter(
      (p) => Number(p.status) === 0
    ).length;

    let mine = 0;
    if (account) {
      const accLower = account.toLowerCase();
      mine = this.loadedProjects.filter(
        (p) =>
          String(p.client || "").toLowerCase() === accLower ||
          String(p.freelancer || "").toLowerCase() === accLower
      ).length;
    }

    return { all, open, mine };
  }

  /**
   * Retorna os projetos filtrados conforme a aba ativa.
   */
  getFilteredProjects(account) {
    if (this.currentFilter === "open") {
      return this.loadedProjects.filter((p) => Number(p.status) === 0);
    }

    if (this.currentFilter === "mine") {
      if (!account) return null; // Sinaliza carteira desconectada
      const accLower = account.toLowerCase();
      return this.loadedProjects.filter(
        (p) =>
          String(p.client || "").toLowerCase() === accLower ||
          String(p.freelancer || "").toLowerCase() === accLower
      );
    }

    return [...this.loadedProjects];
  }
}