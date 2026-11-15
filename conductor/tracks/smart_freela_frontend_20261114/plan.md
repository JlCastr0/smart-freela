# Implementation Plan: Frontend Web3.js Smart Freela

## Phase 1: Semantic HTML5 Structure & Responsive CSS3 Design
- [ ] Task: Build `frontend/index.html` structure with all cards and modals
    - [ ] Create header with dynamic network dot, account balance, and connect button
    - [ ] Create create-project card, projects-feed container, owner-admin card, and activity-feed card
    - [ ] Create modal elements for submitting delivery and resolving disputes
- [ ] Task: Style `frontend/styles.css` matching teacher's reference aesthetics
    - [ ] Configure custom properties (:root colors, shadows, borders)
    - [ ] Build responsive grid layout, status badges, buttons, and alert boxes
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Web3.js Connection, Network Switch & Read Queries
- [ ] Task: Implement MetaMask connection and Sepolia network handling in `frontend/app.js`
    - [ ] Connect wallet, retrieve accounts, verify Sepolia (11155111 / 0xaa36a7) and auto-switch
    - [ ] Listen to `accountsChanged` and `chainChanged` events
- [ ] Task: Implement contract read calls and dynamic project list rendering
    - [ ] Instantiate web3 contract with `CONTRACT_ABI` and `CONTRACT_ADDRESS`
    - [ ] Query `totalProjetos`, fetch each project, and render interactive cards with appropriate action buttons
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Write Transactions, Role-Based UI, Event Feed & Error Handling
- [ ] Task: Implement write transactions with ETH and lifecycle methods
    - [ ] Implement `criarProjeto` sending ETH (`value: web3.utils.toWei(...)`)
    - [ ] Implement `aceitarProjeto`, `entregarProjeto`, `aprovarEFinalizar`, `cancelarProjeto`, `abrirDisputa`
- [ ] Task: Implement Owner-only features and Event Feed
    - [ ] Toggle Admin panel visibility for owner (`dono`) with `sacarTaxas` and `resolverDisputa`
    - [ ] Query past events / listen to new events and render the Activity Feed
- [ ] Task: Implement transaction feedback banner and friendly error handling
    - [ ] Show transaction status (Pending, Confirmed, Reverted) with clickable Etherscan links
    - [ ] Friendly Portuguese error messages for code 4001, insufficient funds, and reverts
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
