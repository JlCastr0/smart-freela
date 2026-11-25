import {
  SEPOLIA_CHAIN_ID_DEC,
  SEPOLIA_CHAIN_ID_HEX,
  SEPOLIA_EXPLORER_TX,
} from "../config/network.js";

/**
 * Serviço responsável pela conexão com a MetaMask, validação/troca da rede Sepolia
 * e consulta de saldo da carteira ativa.
 */
export class WalletService {
  constructor() {
    this.ethereum = typeof window !== "undefined" ? window.ethereum : null;
    this.web3 = null;
    this.account = null;
    this.isSepoliaNetwork = false;
  }

  /**
   * Indica se a extensão MetaMask / provedor Ethereum está disponível no navegador.
   */
  isProviderAvailable() {
    return Boolean(this.ethereum);
  }

  /**
   * Inicializa a instância Web3 caso o provedor esteja presente.
   */
  ensureWeb3() {
    if (!this.isProviderAvailable()) {
      return null;
    }
    if (!this.web3) {
      this.web3 = new window.Web3(this.ethereum);
    }
    return this.web3;
  }

  /**
   * Retorna a instância Web3 ativa.
   */
  getWeb3() {
    return this.ensureWeb3();
  }

  /**
   * Retorna o endereço da conta conectada no momento (ou null).
   */
  getAccount() {
    return this.account;
  }

  /**
   * Define ou limpa a conta ativa internamente.
   */
  setAccount(account) {
    this.account = account || null;
  }

  /**
   * Indica se a carteira está conectada à rede Ethereum Sepolia.
   */
  isConnectedToSepolia() {
    return Boolean(this.account && this.isSepoliaNetwork);
  }

  /**
   * Verifica contas já autorizadas sem abrir o pop-up de conexão.
   */
  async getAuthorizedAccounts() {
    if (!this.isProviderAvailable()) {
      return [];
    }
    const accounts = await this.ethereum.request({ method: "eth_accounts" });
    return Array.isArray(accounts) ? accounts : [];
  }

  /**
   * Solicita ao usuário autorização para conectar a carteira MetaMask.
   */
  async requestAccounts() {
    if (!this.isProviderAvailable()) {
      throw new Error("MetaMask não detectada no navegador.");
    }
    const accounts = await this.ethereum.request({ method: "eth_requestAccounts" });
    return Array.isArray(accounts) ? accounts : [];
  }

  /**
   * Verifica se o chainId atual corresponde à rede Sepolia.
   */
  async checkNetwork() {
    if (!this.isProviderAvailable()) {
      this.isSepoliaNetwork = false;
      return false;
    }
    const chainIdHex = await this.ethereum.request({ method: "eth_chainId" });
    const chainIdDec = BigInt(chainIdHex);
    this.isSepoliaNetwork = chainIdDec === SEPOLIA_CHAIN_ID_DEC;
    return this.isSepoliaNetwork;
  }

  /**
   * Solicita a troca para a rede Sepolia; caso não esteja cadastrada na carteira,
   * tenta adicioná-la automaticamente via wallet_addEthereumChain.
   */
  async switchToSepolia() {
    if (!this.isProviderAvailable()) {
      this.isSepoliaNetwork = false;
      return false;
    }

    if (await this.checkNetwork()) {
      return true;
    }

    try {
      await this.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      this.isSepoliaNetwork = true;
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        await this.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID_HEX,
              chainName: "Sepolia Testnet",
              nativeCurrency: {
                name: "SepoliaETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        this.isSepoliaNetwork = await this.checkNetwork();
        return this.isSepoliaNetwork;
      }
      this.isSepoliaNetwork = false;
      throw switchError;
    }
  }

  /**
   * Consulta o saldo da conta ativa em ETH (formatado com a quantidade de casas decimais desejada).
   */
  async getFormattedBalance(decimals = 4) {
    const web3 = this.ensureWeb3();
    if (!web3 || !this.account) {
      return "0.0000";
    }
    const balanceWei = await web3.eth.getBalance(this.account);
    const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, "ether"));
    return balanceEth.toFixed(decimals);
  }

  /**
   * Monta a URL completa no Sepolia Etherscan para um hash de transação.
   */
  getExplorerTxUrl(txHash) {
    return `${SEPOLIA_EXPLORER_TX}${txHash}`;
  }

  /**
   * Registra ouvintes para mudanças de conta e de rede na MetaMask.
   */
  subscribeEvents({ onAccountsChanged, onChainChanged }) {
    if (!this.isProviderAvailable()) {
      return;
    }

    if (typeof onAccountsChanged === "function") {
      this.ethereum.on("accountsChanged", (accounts) => {
        onAccountsChanged(Array.isArray(accounts) ? accounts : []);
      });
    }

    if (typeof onChainChanged === "function") {
      this.ethereum.on("chainChanged", (chainId) => {
        onChainChanged(chainId);
      });
    }
  }
}