# Specification: Frontend Web3.js Smart Freela

## 1. Overview
Desenvolver o frontend web descentralizado em HTML5, CSS3 e JavaScript vanilla com a biblioteca Web3.js 4.x via CDN para conectar usuários (clientes e freelancers) e administradores ao contrato `SmartFreela.sol` na testnet Sepolia. A interface adota a estética didática dos projetos de referência do professor (`urna-ledger-mvp-didatico` e `mural-simples`), garantindo responsividade, feedback em tempo real e tratamento amigável de erros.

## 2. Functional Requirements
- **FR-01 (Conexão e Carteira):** Botão "Conectar MetaMask" exibindo endereço truncado (`0x1234...5678`), saldo em ETH e detecção de rede.
- **FR-02 (Verificação de Rede Sepolia):** Checar Chain ID `11155111` (`0xaa36a7`); alertar o usuário se estiver em outra rede e oferecer troca automática via `wallet_switchEthereumChain`.
- **FR-03 (Reatividade de Conta e Rede):** Ouvintes `accountsChanged` e `chainChanged` para atualizar a tela sem recarregamento manual.
- **FR-04 (Criação de Projetos com ETH):** Formulário para informar título, descrição e valor do depósito em ETH. Disparar `criarProjeto` com `value` em wei via `.send({ from, value })`.
- **FR-05 (Listagem e Leitura de Projetos):** Consulta via `.call()` ao contrato (`totalProjetos`, `obterProjeto`), exibindo cards de projetos com badges de status coloridos, valores e botões de ação contextuais.
- **FR-06 (Ações de Ciclo de Vida):**
  - Freelancer: Botão "Aceitar Projeto" (se Aberto) e "Submeter Entrega" com hash (se Em Andamento).
  - Cliente: Botão "Aprovar e Liberar Pagamento" (se Entregue) e "Cancelar Projeto" (se Aberto).
  - Partes: Botão "Abrir Disputa" (se Em Andamento ou Entregue).
- **FR-07 (Painel Administrativo do Dono):** Detectar se a carteira conectada é o `dono` do contrato (`apenasDono`); exibir painel de controle exclusivo para saque de taxas acumuladas (`sacarTaxas`) e resolução de disputas (`resolverDisputa`).
- **FR-08 (Feedback de Transações e Etherscan):** Notificação com estados *Pendente*, *Confirmada* e *Falhou*, exibindo o hash da transação com link clicável para o Sepolia Etherscan.
- **FR-09 (Tratamento Amigável de Erros):** Tratamento específico para cancelamento na MetaMask (erro 4001), solicitações pendentes (-32002), saldo insuficiente e decodificação de erros customizados.
- **FR-10 (Feed de Atividades / Eventos):** Exibição dos últimos eventos emitidos pelo contrato (`ProjetoCriado`, `ProjetoAceito`, `ProjetoEntregue`, `ProjetoFinalizado`, `DisputaAberta`).

## 3. Non-Functional & Architecture Requirements
- **NFR-01:** Sem frameworks SPA (React, Vue, etc.); código 100% HTML5, CSS3 e JavaScript puro.
- **NFR-02:** Web3.js 4.x importada via CDN oficial jsDelivr.
- **NFR-03:** Layout responsivo (mobile-first, Flexbox e CSS Grid), paleta compatível com `urna-ledger-mvp-didatico`.
- **NFR-04:** Facilidade de deploy na Vercel (arquivos estáticos em `frontend/`).

## 4. Acceptance Criteria
- [ ] Conexão e troca de rede automática para Sepolia funcionando sem erros.
- [ ] Envio de transação com ETH (`criarProjeto`) e transações sem ETH (`aceitarProjeto`, etc.) funcionando.
- [ ] Links do Sepolia Etherscan gerados corretamente.
- [ ] Tratamento de erros exibindo mensagens claras em português.
- [ ] Painel do Dono visível apenas quando conectado com a carteira proprietária.
