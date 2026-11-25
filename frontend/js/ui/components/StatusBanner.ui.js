import { SEPOLIA_EXPLORER_TX } from "../../config/network.js";

/**
 * Componente responsável pelo banner global de status e link do Sepolia Etherscan.
 */
export class StatusBannerUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
    this.timerId = null;
  }

  setContractWarningVisible(visible) {
    const warning = this.dom.$("contractWarning");
    if (warning) warning.hidden = !visible;
  }

  show(message, type = "neutral", durationMs = 0) {
    const banner = this.dom.$("statusBanner");
    const msgEl = this.dom.$("statusMessage");
    const iconEl = this.dom.$("statusIcon");

    if (!banner || !msgEl || !iconEl) return;

    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    const icons = {
      good: "✅",
      bad: "❌",
      pending: "⏳",
      neutral: "ℹ️",
    };

    banner.className = `status-banner ${type}`;
    msgEl.textContent = message;
    iconEl.textContent = icons[type] || "ℹ️";
    banner.hidden = false;

    if (durationMs > 0) {
      this.timerId = setTimeout(() => {
        if (banner.className.includes(type)) {
          banner.hidden = true;
        }
      }, durationMs);
    }
  }

  setTransactionLink(txHash = null) {
    const link = this.dom.$("txLink");
    if (!link) return;

    if (!txHash) {
      link.hidden = true;
      link.href = "#";
      return;
    }

    link.href = `${SEPOLIA_EXPLORER_TX}${txHash}`;
    link.hidden = false;
  }
}