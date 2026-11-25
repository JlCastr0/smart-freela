import {
  PROJECT_STATUS_LABELS,
  ZERO_ADDRESS,
  ZERO_BYTES32,
  REVIEW_WINDOW_SECONDS
} from "../../config/domain.js";

/**
 * Componente do Mural de Demandas: abas de filtro, contadores e cards de projeto.
 */
export class ProjectBoardUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
  }

  setActiveFilterTab(filterName) {
    const tabs = document.querySelectorAll(".filter-tabs .tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.filter === filterName);
    });
  }

  renderCounters({ all, open, mine }) {
    if (this.dom.$("totalAll")) this.dom.$("totalAll").textContent = String(all);
    if (this.dom.$("totalOpen")) this.dom.$("totalOpen").textContent = String(open);
    if (this.dom.$("totalMine")) this.dom.$("totalMine").textContent = String(mine);
  }

  renderLoading(message = "Consultando smart contract na Sepolia...") {
    const container = this.dom.$("listProjects");
    const emptyState = this.dom.$("emptyProjects");
    if (emptyState) emptyState.hidden = true;
    if (container) {
      container.innerHTML = `<div class="loading-state">${this.dom.escapeHTML(message)}</div>`;
    }
  }

  renderEmpty(message = "Nenhum projeto encontrado nesta categoria.") {
    const container = this.dom.$("listProjects");
    const emptyState = this.dom.$("emptyProjects");
    if (container) container.innerHTML = "";
    if (emptyState) {
      const p = emptyState.querySelector("p");
      if (p) p.textContent = message;
      emptyState.hidden = false;
    }
  }

  renderList(projects, context) {
    const container = this.dom.$("listProjects");
    const emptyState = this.dom.$("emptyProjects");
    if (!container) return;

    if (!projects || projects.length === 0) {
      this.renderEmpty();
      return;
    }

    if (emptyState) emptyState.hidden = true;
    container.innerHTML = projects
      .map((project) => this._buildCardHTML(project, context))
      .join("");
  }

  _buildCardHTML(p, { connectedAccount, contractOwner, formatWeiToEth }) {
    const statusNum = Number(p.status);
    const statusName = PROJECT_STATUS_LABELS[statusNum] || "Desconhecido";
    const ethValue = formatWeiToEth ? formatWeiToEth(p.amount) : "0";

    const accLower = connectedAccount ? connectedAccount.toLowerCase() : "";
    const clientLower = String(p.client || "").toLowerCase();
    const freelancerLower = String(p.freelancer || "").toLowerCase();
    const ownerLower = contractOwner ? contractOwner.toLowerCase() : "";

    const isClient = Boolean(accLower && accLower === clientLower);
    const isFreelancer = Boolean(accLower && accLower === freelancerLower);
    const isOwner = Boolean(accLower && accLower === ownerLower);

    const nowSec = Math.floor(Date.now() / 1000);
    const dueSec = Number(p.dueDate || 0);
    const isExpired = dueSec > 0 && nowSec > dueSec;

    const actions = [];
    const canOpenDispute =
      (statusNum === 1 || statusNum === 2) && (isClient || isFreelancer);

    if (statusNum === 0) {
      // Open
      if (!isClient) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-primary" data-action="accept-project" data-project-id="${p.id}">🤝 Aceitar Projeto</button>`
        );
      } else {
        actions.push(
          `<button type="button" class="btn btn-sm btn-outline" data-action="cancel-project" data-project-id="${p.id}" data-late="false">❌ Cancelar Demanda</button>`
        );
      }
    } else if (statusNum === 1) {
      // InProgress
      if (isFreelancer) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-primary" data-action="open-delivery-modal" data-project-id="${p.id}">🚀 Submeter Entrega</button>`
        );
      }
      if (isClient && isExpired) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-outline" data-action="cancel-project" data-project-id="${p.id}" data-late="true">⏰ Cancelar por Atraso (Reembolso 100%)</button>`
        );
      }
    } else if (statusNum === 2) {
      // Delivered
      const deliveredSec = Number(p.deliveredAt || 0);
      const reviewExpired =
        deliveredSec > 0 && nowSec > deliveredSec + REVIEW_WINDOW_SECONDS;

      if (isClient) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-primary" data-action="approve-project" data-project-id="${p.id}">✅ Aprovar & Liberar Pagamento</button>`
        );
      } else if (isFreelancer && reviewExpired) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-primary" data-action="claim-review-timeout" data-project-id="${p.id}">⏳ Resgatar Pagamento (Prazo de Revisão Expirado)</button>`
        );
      }
    } else if (statusNum === 5) {
      // InDispute
      if (isOwner) {
        actions.push(
          `<button type="button" class="btn btn-sm btn-danger" data-action="open-resolve-modal" data-project-id="${p.id}">⚖️ Resolver Disputa (Admin)</button>`
        );
      }
    }

    if (canOpenDispute) {
      actions.push(
        `<button type="button" class="btn btn-sm btn-danger" data-action="open-dispute" data-project-id="${p.id}">⚖️ Abrir Disputa</button>`
      );
    }

    let deliveryUrlHTML = "";
    if (p.deliveryUrl && String(p.deliveryUrl).trim().length > 0) {
      const rawUrl = String(p.deliveryUrl).trim();
      const safeHref = /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl}`;
      deliveryUrlHTML = `
        <div class="detail-item">
          <span>Link da Entrega (Auditoria):</span>
          <strong><a href="${this.dom.escapeHTML(safeHref)}" target="_blank" rel="noopener noreferrer">${this.dom.escapeHTML(rawUrl)} ↗</a></strong>
        </div>
      `;
    }

    const hashFormatted =
      p.deliveryHash && p.deliveryHash !== ZERO_BYTES32
        ? `<div class="detail-item"><span class="hash-label">Comprovante (bytes32):</span><strong class="hash-val">${this.dom.escapeHTML(p.deliveryHash)}</strong></div>`
        : "";

    const dateStr =
      dueSec > 0 ? new Date(dueSec * 1000).toLocaleDateString("pt-BR") : "N/A";
    const deadlineBadge = statusNum === 1 && isExpired ? " ⚠️ (Expirado)" : "";
    const freelancerDisplay =
      !p.freelancer || p.freelancer === ZERO_ADDRESS
        ? "Aguardando..."
        : `${p.freelancer.slice(0, 6)}...${p.freelancer.slice(-4)}`;

    return `
      <article class="project-card">
        <div class="project-top">
          <div><h3 class="project-title">#${this.dom.escapeHTML(p.id)} · ${this.dom.escapeHTML(p.title)}</h3></div>
          <span class="status-badge status-${statusNum}">${this.dom.escapeHTML(statusName)}</span>
        </div>
        <p class="project-desc">${this.dom.escapeHTML(p.description)}</p>
        <div class="project-details">
          <div class="detail-item"><span>Depósito em Caução:</span><strong>${this.dom.escapeHTML(ethValue)} ETH</strong></div>
          <div class="detail-item"><span>Prazo (Due Date):</span><strong>${this.dom.escapeHTML(dateStr)}${deadlineBadge}</strong></div>
          <div class="detail-item"><span>Cliente:</span><strong>${this.dom.escapeHTML(p.client.slice(0, 6))}...${this.dom.escapeHTML(p.client.slice(-4))}</strong></div>
          <div class="detail-item"><span>Freelancer:</span><strong>${this.dom.escapeHTML(freelancerDisplay)}</strong></div>
          ${deliveryUrlHTML}
          ${hashFormatted}
        </div>
        ${actions.length > 0 ? `<div class="project-actions">${actions.join("")}</div>` : ""}
      </article>
    `;
  }
}