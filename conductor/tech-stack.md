# Technology Stack: Smart Freela

## Blockchain & Smart Contracts
- **Network:** Ethereum Sepolia Testnet (Chain ID `11155111` / `0xaa36a7`)
- **Contract Language:** Solidity `^0.8.24`
- **Compiler / Development Environment:** Remix IDE (Injected Provider – MetaMask)
- **Explorer & Verification:** Sepolia Etherscan (`sepolia.etherscan.io`)
- **Design Pattern:** Checks-Effects-Interactions, Escrow Pattern, Role-based Access Control

## Frontend Web
- **Architecture:** Static Web Application (no heavy SPA frameworks like React/Vue/Angular)
- **Markup:** HTML5 Semantic
- **Styles:** CSS3 Vanilla (Responsive Design, Flexbox & CSS Grid, Custom Properties)
- **Scripting:** Modern JavaScript (ES6+ Vanilla)
- **Web3 Connector:** Web3.js 4.x via CDN (`https://cdn.jsdelivr.net/npm/web3@4.16.0/dist/web3.min.js`)
- **Wallet Connection:** MetaMask Browser Extension via EIP-1193 provider (`window.ethereum`)

## Deployment & Infrastructure
- **Hosting Platform:** Vercel (Hobby tier, continuous deployment via GitHub repo)
- **Version Control:** Git & GitHub
- **Local Testing Server:** Python Simple HTTP Server (`python -m http.server 5500`) ou Node.js serve
