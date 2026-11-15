# Implementation Plan: Frontend Web3.js Smart Freela

## Phase 1: Semantic HTML5 Structure & Responsive CSS3 Design [checkpoint: ff40ca1]
- [x] Task: Build `frontend/index.html` structure with all cards and modals [ff40ca1]
    - [x] Create header with dynamic network dot, account balance, and connect button
    - [x] Create create-project card, projects-feed container, owner-admin card, and activity-feed card
    - [x] Create modal elements for submitting delivery and resolving disputes
- [x] Task: Style `frontend/styles.css` matching teacher's reference aesthetics [ff40ca1]
    - [x] Configure custom properties (:root colors, shadows, borders)
    - [x] Build responsive grid layout, status badges, buttons, and alert boxes
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Web3.js Connection, Network Switch & Read Queries [checkpoint: 6ab1b05]
- [x] Task: Implement MetaMask connection and Sepolia network handling in `frontend/app.js` [6ab1b05]
    - [x] Connect wallet, retrieve accounts, verify Sepolia (11155111 / 0xaa36a7) and auto-switch
    - [x] Listen to `accountsChanged` and `chainChanged` events
- [x] Task: Implement contract read calls and dynamic project list rendering [6ab1b05]
    - [x] Instantiate web3 contract with `CONTRACT_ABI` and `CONTRACT_ADDRESS`
    - [x] Query `totalProjetos`, fetch each project, and render interactive cards with appropriate action buttons
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Write Transactions, Role-Based UI, Event Feed & Error Handling [checkpoint: 6ab1b05]
- [x] Task: Implement write transactions with ETH and lifecycle methods [6ab1b05]
    - [x] Implement `criarProjeto` sending ETH (`value: web3.utils.toWei(...)`)
    - [x] Implement `aceitarProjeto`, `entregarProjeto`, `aprovarEFinalizar`, `cancelarProjeto`, `abrirDisputa`
- [x] Task: Implement Owner-only features and Event Feed [6ab1b05]
    - [x] Toggle Admin panel visibility for owner (`dono`) with `sacarTaxas` and `resolverDisputa`
    - [x] Query past events / listen to new events and render the Activity Feed
- [x] Task: Implement transaction feedback banner and friendly error handling [6ab1b05]
    - [x] Show transaction status (Pending, Confirmed, Reverted) with clickable Etherscan links
    - [x] Friendly Portuguese error messages for code 4001, insufficient funds, and reverts
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
