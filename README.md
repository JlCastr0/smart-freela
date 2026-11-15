# 💼 Smart Freela — dApp de Escrow Descentralizado na Ethereum Sepolia

> Trabalho Prático da disciplina de Blockchain e Contratos Inteligentes  
> Docente: Prof. Fábio

---

## 1. Título do Projeto e Equipe

* **Projeto:** Smart Freela — Plataforma Descentralizada de Custódia (Escrow) de Serviços Freelance
* **Equipe:**
  * João Castro — RA: *(Preencher RA)*
  * Pedro Yutaro — RA: *(Preencher RA)*
  * *(Nome do Integrante 3)* — RA: *(Preencher RA)*

---

## 2. Descrição Geral da Ideia e Problema Resolvido

Plataformas tradicionais centralizadas de contratação freelance cobram taxas exorbitantes (10% a 20%), impõem prazos de repasse demorados e operam sistemas de mediação unilaterais. Em contrapartida, contratações diretas sem intermediação expõem tanto contratantes (ao risco de não entrega) quanto freelancers (ao risco de inadimplência/calote).

O **Smart Freela** resolve este dilema utilizando a blockchain pública **Ethereum (Sepolia)**:
1. **Garantia Total de Fundos (Escrow):** O cliente publica a demanda e deposita o montante em ETH diretamente em custódia no contrato inteligente.
2. **Execução Segura:** O freelancer aceita a demanda com a certeza matemática de que o valor está bloqueado e disponível.
3. **Entrega Criptograficamente Auditável:** Ao concluir o trabalho, o freelancer registra o hash (`bytes32`) da entrega (SHA-256 / IPFS / commit Git) diretamente on-chain.
4. **Liquidação Automatizada com Taxa Mínima:** Com a aprovação do cliente, o contrato calcula e transfere o valor líquido ao freelancer (98%), retendo apenas 2% de taxa para manutenção da plataforma.
5. **Mediação Descentralizada de Disputas:** Se houver divergência, o contrato permite a abertura de disputa formal, mediada pelo administrador da plataforma para divisão proporcional dos fundos.

---

## 3. Endereço do Contrato na Sepolia

* **Contrato:** `SmartFreela.sol`
* **Rede:** Ethereum Sepolia Testnet (Chain ID `11155111` / `0xaa36a7`)
* **Endereço do Contrato:** `0xaAe2fb64bB43e03e1C1563c59588EbF62EeD2640`
* **Sepolia Etherscan:** [https://sepolia.etherscan.io/address/0xaAe2fb64bB43e03e1C1563c59588EbF62EeD2640](https://sepolia.etherscan.io/address/0xaAe2fb64bB43e03e1C1563c59588EbF62EeD2640)

> **Status do Deploy:** Contrato implantado e ativo com sucesso via Remix IDE na rede de testes Sepolia.

---

## 4. Link do Frontend no Ar (Vercel)

* **URL da Aplicação:** `https://smart-freela.vercel.app` *(ou URL gerada no seu deploy da Vercel)*
* **Repositório GitHub:** `https://github.com/JlCastr0/smart-freela`

---

## 5. Tabela de Mapeamento dos Recursos Funcionais Obrigatórios

O contrato `contracts/smart-freela.sol` contempla rigorosamente todos os 7 grupos funcionais exigidos no Guia do Trabalho Prático:

| # | Grupo de Recursos | Linhas no Contrato | Como foi implementado e Justificativa no Tema |
|---|---|---|---|
| **1** | **Tipos de Dados** | Linhas 13 – 20 | • `uint256`: valores monetários em wei (`valor`, `taxasAcumuladas`) e IDs.<br>• `int256`: reputação base inicial do usuário (`reputacaoInicialPadrao = 100`).<br>• `bool`: status operacional do contrato (`ativo`).<br>• `address payable`: carteiras do cliente e do freelancer para transferências de ETH.<br>• `string`: textos dinâmicos de título e descrição.<br>• `bytes32`: hash criptográfico do comprovante de entrega.<br>• `constant`: taxa de 2% imutável em código (`TAXA_PLATAFORMA_PERCENTUAL`).<br>• `immutable`: dono da plataforma definido no deploy (`dono`). |
| **2** | **Funções (Visibilidades e Mutabilidades)** | Linhas 105 – 349 | • `public`: `obterProjeto()`, `calcularValorLiquido()`.<br>• `external`: `criarProjeto()`, `aceitarProjeto()`, `entregarProjeto()`, `aprovarEFinalizar()`, `cancelarProjeto()`, etc.<br>• `internal`: `_processarPagamento()` para reuso seguro de transferências via call.<br>• `private`: `_calcularTaxa()` para cálculo interno da dedução percentual.<br>• `view`: `obterProjeto()`, `listarProjetosDoUsuario()`.<br>• `pure`: `calcularValorLiquido()`, `_calcularTaxa()`.<br>• `payable`: `criarProjeto()` (recebe o depósito em ETH no escrow).<br>• `constructor()`: inicializa o dono da plataforma. |
| **3** | **Estruturas de Controle** | Linhas 120 – 122 e 325 – 348 | • `require`: validação de limites de paginação (`require(limite > 0 && limite <= 50)`).<br>• `if / else`: regras condicionais em validações, reversões e divisões de pagamento.<br>• laço `for` com limite controlado: busca paginada segura contra exaustão de gas em `listarProjetosDoUsuario`. |
| **4** | **Arrays e Mappings** | Linhas 50 – 55 | • Array dinâmico: `uint256[] private _todosOsIds` para indexação global.<br>• Mapping simples: `mapping(uint256 => Projeto) public projetos` para acesso $O(1)$ por ID.<br>• Mapping aninhado: `mapping(address => mapping(uint256 => bool)) public projetosParticipados` para controle de acesso eficiente de projetos por carteira. |
| **5** | **Structs e Enums** | Linhas 24 – 46 | • `enum StatusProjeto`: ciclo de vida completo (`Aberto`, `EmAndamento`, `Entregue`, `Finalizado`, `Cancelado`, `EmDisputa`).<br>• `struct Projeto`: registro coeso com 10 campos (`id`, `cliente`, `freelancer`, `valor`, `titulo`, `descricao`, `hashEntrega`, `status`, `criadoEm`, `finalizadoEm`). |
| **6** | **Modificadores** | Linhas 80 – 101 | • `apenasDono`: controle de acesso administrativo.<br>• `noStatus(uint256 id, StatusProjeto esperado)`: **modificador com parâmetro** que assegura que uma transação só ocorra no estágio permitido.<br>• `apenasCliente(uint256 id)` e `apenasFreelancer(uint256 id)`: garantem autorização estrita das partes. |
| **7** | **Eventos e Erros Personalizados** | Linhas 59 – 76 | • Eventos indexados: `ProjetoCriado`, `ProjetoAceito`, `ProjetoEntregue`, `ProjetoFinalizado`, `ProjetoCancelado`, `DisputaAberta`, `DisputaResolvida`, `TaxasSacadas`.<br>• Erros customizados: `error ValorInvalido()`, `error DadosInvalidos()`, `error AcessoNegado()`, `error StatusIncorreto(...)`, `error FalhaNoPagamento()`, `error PercentualInvalido()`, `error ProjetoInexistente()`. |

---

## 6. Roteiro de Testes Passo a Passo (Avaliação do Docente)

Para validar todos os fluxos da dApp, recomendamos utilizar duas contas na MetaMask com saldo SepoliaETH (ex.: Conta 1 = Cliente, Conta 2 = Freelancer):

### Cenário Principal: Ciclo Completo de Contratação e Pagamento
1. **Conectar Carteira (Cliente):**
   * Abra a aplicação no navegador.
   * Clique em **"Conectar MetaMask"** com a Conta 1.
   * Observe o indicador de rede ficar verde (`Sepolia Conectada`), o endereço truncado e o saldo em ETH exibidos no cabeçalho.
2. **Publicar Demanda com Depósito em ETH:**
   * No card **"Publicar Novo Projeto"**, preencha o Título (ex.: `Criação de Logo`), a Descrição e o Valor (ex.: `0.01` ETH).
   * Clique em **"Criar Projeto & Bloquear ETH"**.
   * Confirme a transação na MetaMask.
   * Observe o banner de feedback exibir o status pendente e o link clicável para o **Sepolia Etherscan**.
   * Ao confirmar, o projeto aparecerá no mural com o badge laranja `Aberto`.
3. **Aceitar Projeto (Freelancer):**
   * Alterne a MetaMask para a Conta 2 (Freelancer).
   * No mural, localize o projeto criado e clique em **"🤝 Aceitar Projeto"**.
   * Confirme na MetaMask. O status mudará para azul `Em Andamento` e o endereço do freelancer será registrado.
4. **Submeter Entrega do Trabalho:**
   * Ainda na Conta 2, clique no botão **"🚀 Submeter Entrega"**.
   * No modal aberto, insira o link do repositório/entrega. O sistema gerará o hash Keccak-256 (`bytes32`) em tempo real.
   * Clique em **"Registrar Entrega On-Chain"** e confirme a transação. O status mudará para roxo `Entregue`.
5. **Aprovação e Liquidação Financeira:**
   * Retorne a MetaMask para a Conta 1 (Cliente).
   * Clique em **"✅ Aprovar & Liberar Pagamento"**.
   * Confirme na MetaMask.
   * **Resultado:** O status muda para verde `Finalizado`. O contrato transfere 98% do ETH para a carteira do freelancer (Conta 2) e retém 2% no contrato como taxa de protocolo.
6. **Feed de Atividades:**
   * Observe o card **"Feed de Eventos On-Chain"** na lateral esquerda, listando em tempo real todos os eventos emitidos com seus respectivos números de bloco e links do Etherscan.

### Cenários Secundários: Cancelamento e Disputa
* **Cancelamento:** Crie um projeto com a Conta 1 e, enquanto estiver `Aberto`, clique em **"❌ Cancelar Demanda"**. O contrato reembolsa 100% do ETH de volta para o cliente.
* **Disputa & Mediação:** Em um projeto `Em Andamento`, clique em **"⚖️ Abrir Disputa"**. Conecte a carteira do **Dono** (`dono`); o **"Painel do Administrador"** será exibido, permitindo definir a divisão dos fundos (ex.: 50/50) ou realizar o saque das taxas acumuladas via **"💰 Sacar Taxas da Plataforma"**.

---

## 7. Instruções para Rodar Localmente

O frontend é 100% estático (HTML5, CSS3 e JavaScript vanilla com Web3.js via CDN), dispensando builds complexos:

### Opção 1: Usando Python (Recomendado)
```bash
# Na raiz do projeto, entre na pasta do frontend:
cd frontend

# Inicie o servidor HTTP local:
python -m http.server 5500
```
Abra seu navegador em: `http://localhost:5500`

### Opção 2: Usando Node.js (npx serve)
```bash
npx serve frontend -p 5500
```

### Opção 3: Executar a Suíte de Testes Automatizados dos Contratos
O projeto conta com suíte de testes unitários automatizados em Hardhat:
```bash
# Instalar dependências de desenvolvimento:
npm install

# Executar todos os 14 testes unitários:
npm test
```

---

## 8. Decisões de Design e Arquitetura

1. **Separação On-Chain vs. Off-Chain:**
   * **On-Chain:** Dados financeiros (valores em wei), controle de custódia (escrow), endereços autorizados, estados do ciclo de vida e a **impressão digital da entrega (`bytes32`)**. Isso garante integridade imutável com custo de gas controlado.
   * **Off-Chain / Frontend:** O conteúdo bruto dos arquivos e links detalhados são mantidos pelo usuário, gravando no contrato apenas o hash criptográfico comprobatório, evitando o armazenamento on-chain de grandes volumes de texto que encareceriam o gas.
2. **Segurança contra Reentrância (Checks-Effects-Interactions):**
   * Em `aprovarEFinalizar`, `cancelarProjeto`, `resolverDisputa` e `sacarTaxas`, o estado interno (`status`, `taxasAcumuladas`) é atualizado **antes** da realização da transferência externa via `.call{value: quantia}("")`.
3. **Economia de Gas com Custom Errors:**
   * Em vez de strings de erro (`require(cond, "Mensagem Longa")`), utilizamos `error NomeDoErro()` e `revert NomeDoErro()`, que reduzem o custo de deploy e de execução das transações em caso de reversão.
4. **Prevenção de DoS em Laços de Repetição:**
   * A função `listarProjetosDoUsuario` implementa paginação com trava estrita de limite (`require(limite <= 50)`), impedindo que um número crescente de projetos estoure o limite de gas de bloco (*block gas limit*).
5. **Estética Visual Inspirada nos Exemplos do Docente:**
   * A interface adotou o mesmo design system clean do projeto `urna-ledger-mvp-didatico`: cabeçalho escuro com badge dinâmico de rede, caixas de status (`good`, `bad`, `neutral`, `pending`), cards bem delineados e links diretos para o Sepolia Etherscan.

---

## 9. Dificuldades Encontradas e Como Foram Contornadas

1. **Tratamento de Erros e Decodificação de Custom Errors na Web3.js 4.x:**
   * *Desafio:* A biblioteca Web3.js 4.x encapsula reversões de contratos em objetos de erro internos, dificultando a exibição de mensagens amigáveis ao usuário final.
   * *Solução:* Foi desenvolvida uma camada centralizada `tratarErro()` no `frontend/app.js` que inspeciona o código e a mensagem de erro da MetaMask (incluindo erro `4001` de rejeição pelo usuário e `insufficient funds`), mapeando para mensagens claras e em português no banner de status.
2. **Troca Automática de Rede para a Sepolia:**
   * *Desafio:* O usuário poderia estar conectado à Mainnet ou a outras testnets (como Holesky ou Polygon Amoy).
   * *Solução:* Implementou-se o método padrão `wallet_switchEthereumChain` com fallback para `wallet_addEthereumChain` caso a Sepolia ainda não estivesse cadastrada na carteira do avaliador.
3. **Geração de Hash `bytes32` no Navegador:**
   * *Desafio:* A submissão de entrega no contrato exigia um tipo `bytes32` estrito, enquanto usuários geralmente inserem links ou textos.
   * *Solução:* O modal de entrega calcula automaticamente o hash Keccak-256 do texto inserido usando `web3.utils.sha3()`, exibindo o hash formatado em tempo real antes de disparar a transação on-chain.
