import { SEPOLIA_EXPLORER_TX } from "../../config/network.js";

/**
 * Componente do Feed lateral de Eventos On-Chain.
 */
export class EventsFeedUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
  }

  renderEmpty(message = "Nenhum evento registrado nos blocos recentes.") {
    const feed = this.dom.$("feedEvents");
    if (feed) {
      feed.innerHTML = `<div class="feed-empty">${this.dom.escapeHTML(message)}</div>`;
    }
  }

  render(events, formatWeiToEth) {
    const feed = this.dom.$("feedEvents");
    if (!feed) return;

    if (!events || events.length === 0) {
      this.renderEmpty();
      return;
    }

    feed.innerHTML = events
      .map((ev) => {
        const { cssClass, text } = this._formatSummary(ev, formatWeiToEth);
        return `
          <div class="event-entry ${cssClass}">
            <strong>${this.dom.escapeHTML(text)}</strong>
            <div class="event-meta">
              <span>Bloco #${this.dom.escapeHTML(ev.blockNumber)}</span>
              <a href="${SEPOLIA_EXPLORER_TX}${this.dom.escapeHTML(ev.transactionHash)}" target="_blank" rel="noopener noreferrer">Etherscan ↗</a>
            </div>
          </div>
        `;
      })
      .join("");
  }

  _formatSummary(ev, formatWeiToEth) {
    const vals = ev.returnValues || {};

    switch (ev.event) {
      case "ProjectCreated":
        return {
          cssClass: "success",
          text: `Projeto #${vals.id} criado por ${vals.client?.slice(0, 6)}... (${formatWeiToEth(vals.amount)} ETH)`,
        };
      case "ProjectAccepted":
        return {
          cssClass: "info",
          text: `Projeto #${vals.id} aceito pelo freelancer ${vals.freelancer?.slice(0, 6)}...`,
        };
      case "ProjectDelivered":
        return {
          cssClass: "warn",
          text: `Entrega submetida para o Projeto #${vals.id}`,
        };
      case "ProjectCompleted":
        return {
          cssClass: "success",
          text: `Projeto #${vals.id} finalizado e pago ao freelancer!`,
        };
      case "ProjectCanceled":
        return {
          cssClass: "danger",
          text: `Projeto #${vals.id} cancelado e reembolsado ao cliente`,
        };
      case "DisputeOpened":
        return {
          cssClass: "danger",
          text: `Disputa aberta para o Projeto #${vals.id}`,
        };
      case "DisputeResolved":
        return {
          cssClass: "info",
          text: `Disputa do Projeto #${vals.id} resolvida pelo mediador`,
        };
      case "FeesWithdrawn":
        return {
          cssClass: "info",
          text: "Taxas da plataforma sacadas pelo administrador",
        };
      case "ContractStatusToggled":
        return {
          cssClass: "warn",
          text: `Status do contrato alterado para: ${vals.isActive ? "Ativo" : "Pausado"}`,
        };
      default:
        return {
          cssClass: "info",
          text: ev.event || "Evento On-Chain",
        };
    }
  }
}