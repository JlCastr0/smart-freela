/**
 * Modal de mediação de disputa pelo administrador (divisão percentual de escrow).
 */
export class DisputeModalUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
    this.activeProjectId = null;
  }

  open(projectId) {
    this.activeProjectId = projectId;
    const input = this.dom.$("freelancerPercentage");
    if (input) input.value = "50";
    this.updateSplitPreview(50);
    this.dom.setModalVisible("modalDispute", true);
  }

  close() {
    this.activeProjectId = null;
    this.dom.setModalVisible("modalDispute", false);
  }

  getState() {
    const raw = this.dom.$("freelancerPercentage")?.value ?? "50";
    return {
      projectId: this.activeProjectId,
      freelancerPercentage: parseInt(raw, 10),
    };
  }

  updateSplitPreview(freelancerPercentage) {
    const parsed = Number.isNaN(freelancerPercentage) ? 0 : freelancerPercentage;
    const clamped = Math.max(0, Math.min(100, parsed));
    const clientVal = 100 - clamped;
    const hint = this.dom.$("previewDisputeSplit");
    if (hint) {
      hint.textContent = `Freelancer: ${clamped}% | Cliente: ${clientVal}%`;
    }
  }
}