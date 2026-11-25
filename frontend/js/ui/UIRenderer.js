import { DomHelper } from "./core/DomHelper.js";
import { DialogPrimitive } from "./core/Dialog.primitive.js";
import { NavbarWalletUI } from "./components/NavbarWallet.ui.js";
import { StatusBannerUI } from "./components/StatusBanner.ui.js";
import { AdminPanelUI } from "./components/AdminPanel.ui.js";
import { ProjectFormUI } from "./components/ProjectForm.ui.js";
import { ProjectBoardUI } from "./components/ProjectBoard.ui.js";
import { EventsFeedUI } from "./components/EventsFeed.ui.js";
import { DeliveryModalUI } from "./modals/DeliveryModal.ui.js";
import { DisputeModalUI } from "./modals/DisputeModal.ui.js";

/**
 * Fachada (Facade) da camada de apresentação.
 * Compõe primitivos, componentes e modais isolados, expondo uma interface única ao main.js.
 */
export class UIRenderer {
  constructor() {
    this.dom = new DomHelper();
    this.dialog = new DialogPrimitive(this.dom);
    this.navbar = new NavbarWalletUI(this.dom);
    this.banner = new StatusBannerUI(this.dom);
    this.adminPanel = new AdminPanelUI(this.dom);
    this.projectForm = new ProjectFormUI(this.dom);
    this.projectBoard = new ProjectBoardUI(this.dom);
    this.eventsFeed = new EventsFeedUI(this.dom);
    this.deliveryModal = new DeliveryModalUI(this.dom);
    this.disputeModal = new DisputeModalUI(this.dom);
  }

  $(id) {
    return this.dom.$(id);
  }

  switchView(viewName) {
    this.dom.switchView(viewName);
  }

  // Banner e avisos
  setContractWarningVisible(visible) {
    this.banner.setContractWarningVisible(visible);
  }

  showStatus(message, type = "neutral", durationMs = 0) {
    this.banner.show(message, type, durationMs);
  }

  setTransactionLink(txHash = null) {
    this.banner.setTransactionLink(txHash);
  }

  // Cabeçalho / Carteira
  renderNetworkState(state) {
    this.navbar.renderNetworkState(state);
  }

  renderWalletBalance(formattedEth) {
    this.navbar.renderBalance(formattedEth);
  }

  renderUserReputation(reputationPoints) {
    this.navbar.renderReputation(reputationPoints);
  }

  // Painel Admin e Formulário
  setAdminPanelVisible(visible) {
    this.adminPanel.setVisible(visible);
  }

  renderContractOperationalState(state) {
    this.projectForm.setContractActiveState(state.isContractActive);
    this.adminPanel.renderOperationalState(state);
  }

  getCreateProjectFormValues() {
    return this.projectForm.getValues();
  }

  resetCreateProjectForm() {
    this.projectForm.reset();
  }

  // Mural de Projetos
  setActiveFilterTab(filterName) {
    this.projectBoard.setActiveFilterTab(filterName);
  }

  renderProjectCounters(counters) {
    this.projectBoard.renderCounters(counters);
  }

  renderProjectsLoading(message) {
    this.projectBoard.renderLoading(message);
  }

  renderProjectsEmpty(message) {
    this.projectBoard.renderEmpty(message);
  }

  renderProjectsList(projects, context) {
    this.projectBoard.renderList(projects, context);
  }

  // Feed de Eventos
  renderEventsFeedEmpty(message) {
    this.eventsFeed.renderEmpty(message);
  }

  renderEventsFeed(events, formatWeiToEth) {
    this.eventsFeed.render(events, formatWeiToEth);
  }

  // Modais e Diálogos
  openDeliveryModal(projectId) {
    this.deliveryModal.open(projectId);
  }

  closeDeliveryModal() {
    this.deliveryModal.close();
  }

  getDeliveryModalState() {
    return this.deliveryModal.getState();
  }

  updateDeliveryHashPreview(hashHex) {
    this.deliveryModal.updateHashPreview(hashHex);
  }

  openDisputeModal(projectId) {
    this.disputeModal.open(projectId);
  }

  closeDisputeModal() {
    this.disputeModal.close();
  }

  getDisputeModalState() {
    return this.disputeModal.getState();
  }

  updateDisputeSplitPreview(freelancerPercentage) {
    this.disputeModal.updateSplitPreview(freelancerPercentage);
  }

  showConfirmModal(options) {
    return this.dialog.confirm(options);
  }

  showAlertModal(message, title) {
    return this.dialog.alert(message, title);
  }
}