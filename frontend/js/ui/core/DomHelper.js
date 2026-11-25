/**
 * Utilitários base de manipulação segura do DOM e navegação entre views.
 */
export class DomHelper {
  /**
   * Busca um elemento pelo ID no documento.
   */
  $(id) {
    return document.getElementById(id);
  }

  /**
   * Escapa strings antes da interpolação em HTML para prevenir XSS.
   */
  escapeHTML(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Alterna a visibilidade de seções marcadas com [data-view="<nome>"].
   */
  switchView(viewName) {
    const views = document.querySelectorAll("[data-view]");
    views.forEach((el) => {
      el.hidden = el.dataset.view !== viewName;
    });
  }

  /**
   * Controla a exibição de um backdrop de modal pelo ID.
   */
  setModalVisible(modalId, visible) {
    const el = this.$(modalId);
    if (el) {
      el.hidden = !visible;
    }
  }
}