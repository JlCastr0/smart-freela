import { ZERO_BYTES32 } from "../../config/domain.js";

/**
 * Modal de submissão de entregável (URL de auditoria + preview de hash Keccak-256).
 */
export class DeliveryModalUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
    this.activeProjectId = null;
  }

  open(projectId) {
    this.activeProjectId = projectId;
    const input = this.dom.$("deliveryText");
    if (input) input.value = "";
    this.updateHashPreview(ZERO_BYTES32);
    this.dom.setModalVisible("modalDelivery", true);
  }

  close() {
    this.activeProjectId = null;
    this.dom.setModalVisible("modalDelivery", false);
  }

  getState() {
    return {
      projectId: this.activeProjectId,
      deliveryUrl: this.dom.$("deliveryText")?.value.trim() || "",
      deliveryHash:
        this.dom.$("previewDeliveryHash")?.textContent.trim() || ZERO_BYTES32,
    };
  }

  updateHashPreview(hashHex) {
    const preview = this.dom.$("previewDeliveryHash");
    if (preview) {
      preview.textContent = hashHex || ZERO_BYTES32;
    }
  }
}