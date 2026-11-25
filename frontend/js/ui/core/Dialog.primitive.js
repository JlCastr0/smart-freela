/**
 * Primitivo de diálogo modal assíncrono baseado em Promise.
 * Desacoplado de regras de negócio para ser reutilizado em qualquer fluxo.
 */
export class DialogPrimitive {
  /**
   * @param {import("./DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
    this.resolveFn = null;
  }

  close(result = false) {
    this.dom.setModalVisible("modalDialog", false);
    if (this.resolveFn) {
      const resolve = this.resolveFn;
      this.resolveFn = null;
      resolve(result);
    }
  }

  confirm({
    title = "Confirmar Ação",
    message = "Deseja continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "primary",
  }) {
    return new Promise((resolve) => {
      this.resolveFn = resolve;

      const titleEl = this.dom.$("dialogTitle");
      const msgEl = this.dom.$("dialogMessage");
      const btnConfirm = this.dom.$("btnConfirmDialog");
      const btnCancel = this.dom.$("btnCancelDialog");
      const btnClose = this.dom.$("btnCloseDialog");

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;

      if (btnConfirm) {
        btnConfirm.textContent = confirmText;
        btnConfirm.className = `btn ${
          variant === "danger" ? "btn-danger" : "btn-primary"
        }`;
        btnConfirm.onclick = () => this.close(true);
      }

      if (btnCancel) {
        btnCancel.textContent = cancelText;
        btnCancel.hidden = false;
        btnCancel.onclick = () => this.close(false);
      }

      if (btnClose) {
        btnClose.onclick = () => this.close(false);
      }

      this.dom.setModalVisible("modalDialog", true);
    });
  }

  alert(message, title = "⚠️ Atenção") {
    return new Promise((resolve) => {
      this.resolveFn = resolve;

      const titleEl = this.dom.$("dialogTitle");
      const msgEl = this.dom.$("dialogMessage");
      const btnConfirm = this.dom.$("btnConfirmDialog");
      const btnCancel = this.dom.$("btnCancelDialog");
      const btnClose = this.dom.$("btnCloseDialog");

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;

      if (btnConfirm) {
        btnConfirm.textContent = "Entendi";
        btnConfirm.className = "btn btn-primary";
        btnConfirm.onclick = () => this.close(true);
      }

      if (btnCancel) {
        btnCancel.hidden = true;
      }

      if (btnClose) {
        btnClose.onclick = () => this.close(true);
      }

      this.dom.setModalVisible("modalDialog", true);
    });
  }
}