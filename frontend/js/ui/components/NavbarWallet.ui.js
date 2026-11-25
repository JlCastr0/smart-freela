/**
 * Componente de exibição do estado da carteira MetaMask, rede Sepolia, saldo e reputação.
 */
export class NavbarWalletUI {
  /**
   * @param {import("../core/DomHelper.js").DomHelper} dom
   */
  constructor(dom) {
    this.dom = dom;
  }

  renderNetworkState({ isConnected, isSepoliaOk, account }) {
    const dot = this.dom.$("networkDot");
    const netText = this.dom.$("networkText");
    const walletAcc = this.dom.$("walletAccount");
    const btn = this.dom.$("connectBtn");
    const repBadge = this.dom.$("walletReputation");
    const balBadge = this.dom.$("walletBalance");

    if (!dot || !netText || !walletAcc || !btn) return;

    if (isConnected && isSepoliaOk && account) {
      dot.className = "dot ok";
      netText.textContent = "Sepolia Conectada";
      walletAcc.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
      btn.textContent = "Conectado";
      btn.disabled = true;
      btn.dataset.action = "connected";
    } else if (account && !isSepoliaOk) {
      dot.className = "dot warn";
      netText.textContent = "Rede Incorreta";
      walletAcc.textContent = "Mude para Sepolia na MetaMask";
      btn.textContent = "Trocar Rede";
      btn.disabled = false;
      btn.dataset.action = "switch-network";
      if (repBadge) repBadge.hidden = true;
      if (balBadge) balBadge.textContent = "";
    } else {
      dot.className = "dot";
      netText.textContent = "MetaMask Desconectada";
      walletAcc.textContent = "Clique ao lado para conectar";
      btn.textContent = "Conectar MetaMask";
      btn.disabled = false;
      btn.dataset.action = "connect-wallet";
      if (repBadge) repBadge.hidden = true;
      if (balBadge) balBadge.textContent = "";
    }
  }

  renderBalance(formattedEth) {
    const balBadge = this.dom.$("walletBalance");
    if (balBadge) {
      balBadge.textContent = formattedEth ? `${formattedEth} ETH` : "";
    }
  }

  renderReputation(reputationPoints) {
    const repBadge = this.dom.$("walletReputation");
    if (!repBadge) return;

    if (reputationPoints === null || reputationPoints === undefined) {
      repBadge.hidden = true;
      return;
    }

    repBadge.textContent = `⭐ Reputação: ${reputationPoints} pts`;
    repBadge.hidden = false;
  }
}