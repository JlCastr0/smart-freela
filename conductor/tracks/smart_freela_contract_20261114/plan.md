# Implementation Plan: Contrato Inteligente SmartFreela.sol

## Phase 1: Environment & Test Harness Setup [checkpoint: fe8cec1]
- [x] Task: Setup local Solidity compilation & test environment [fe8cec1]
    - [x] Create/configure test runner (Mocha/Chai or Hardhat script) to compile and test Solidity contracts
    - [x] Verify environment execution with a baseline test
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Core Data Structures & Escrow Contract Implementation (TDD)
- [x] Task: Write failing tests for SmartFreela data structures, deployment, and creation of projects with ETH
    - [x] Write unit test for contract deployment (dono immutable, taxa constant)
    - [x] Write unit test for `criarProjeto` requiring `msg.value > 0`, non-empty title/description, emitting `ProjetoCriado`
    - [x] Run test and confirm failure (Red Phase)
- [x] Task: Implement SmartFreela constructor, constants, immutable variables, structs, enums, and `criarProjeto` [f6ae981]
    - [x] Define `enum StatusProjeto` and `struct Projeto`
    - [x] Implement constructor, `criarProjeto` payable, and state variables
    - [x] Run tests and confirm pass (Green Phase)
- [ ] Task: Write failing tests for project lifecycle (aceitar, entregar, aprovarEFinalizar) and CEI pattern
    - [ ] Write unit test for `aceitarProjeto` transitioning to `EmAndamento`
    - [ ] Write unit test for `entregarProjeto` with `bytes32` hash transitioning to `Entregue`
    - [ ] Write unit test for `aprovarEFinalizar` paying out net ETH to freelancer and accumulating platform fee
    - [ ] Run test and confirm failure (Red Phase)
- [ ] Task: Implement `aceitarProjeto`, `entregarProjeto`, and `aprovarEFinalizar` with custom errors and events
    - [ ] Implement modifiers (`noStatus`, `apenasCliente`, `apenasFreelancer`)
    - [ ] Implement business methods and custom errors (`StatusIncorreto`, `AcessoNegado`, `FalhaNoPagamento`)
    - [ ] Run tests and confirm pass (Green Phase)
- [ ] Task: Write failing tests for cancellation, dispute resolution, fee withdrawal, and query functions
    - [ ] Write unit test for `cancelarProjeto` refunding ETH to client
    - [ ] Write unit test for `abrirDisputa` and `resolverDisputa` (owner split)
    - [ ] Write unit test for `sacarTaxas` by owner
    - [ ] Write unit test for view/pure helper functions and user project pagination
    - [ ] Run test and confirm failure (Red Phase)
- [ ] Task: Implement `cancelarProjeto`, `abrirDisputa`, `resolverDisputa`, `sacarTaxas`, and view/pure helpers with pagination
    - [ ] Implement cancellation and dispute methods
    - [ ] Implement owner withdrawal of platform fees
    - [ ] Implement pagination loop (`for` with limit) and view queries
    - [ ] Run tests and confirm pass (Green Phase)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: NatSpec Documentation, 7-Resource Tags & Final Contract Validation
- [ ] Task: Add NatSpec documentation to all methods and mark the 7 required resource tags
    - [ ] Add `/// @notice`, `/// @param`, `/// @return` across all functions
    - [ ] Ensure all 7 tags (`// [Recurso: TiposDeDados]`, `// [Recurso: Funcoes]`, `// [Recurso: EstruturasDeControle]`, `// [Recurso: ArraysEMappings]`, `// [Recurso: StructsEEnums]`, `// [Recurso: Modificadores]`, `// [Recurso: EventosEErros]`) are clearly marked
- [ ] Task: Export ABI and update `artifacts/` or `frontend/config.js`
    - [ ] Generate compiled ABI for the frontend integration
    - [ ] Save contract artifacts and ABI
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
