# Specification: Contrato Inteligente SmartFreela.sol

## 1. Overview
Desenvolver e validar o contrato inteligente `SmartFreela.sol` na linguagem Solidity (^0.8.24) para atuar como o núcleo descentralizado de custódia (*escrow*) da dApp Smart Freela na Ethereum Sepolia. O contrato gerencia todo o ciclo de vida da contratação de serviços freelance, garantindo retenção de fundos em ETH, entrega auditável por hash, liberação automatizada de pagamento e governança de disputas, cumprindo integralmente os 7 grupos de recursos exigidos no Guia do Trabalho Prático.

## 2. Functional Requirements
- **FR-01 (Criação de Projeto):** Permitir que qualquer cliente crie um projeto enviando ETH (`msg.value > 0`), informando título e descrição (`criarProjeto`). Fundos retidos em custódia.
- **FR-02 (Aceite de Projeto):** Permitir que um freelancer aceite um projeto no status `Aberto`, vinculando seu endereço e alterando o status para `EmAndamento`.
- **FR-03 (Entrega de Projeto):** Permitir que o freelancer vinculado registre a entrega com um comprovante em `bytes32` (hash do artefato) e descrição textual, alterando o status para `Entregue`.
- **FR-04 (Aprovação e Pagamento):** Permitir que apenas o cliente aprove a entrega, acionando a transferência do valor líquido ao freelancer (descontada a taxa de 2%) via call seguindo Checks-Effects-Interactions.
- **FR-05 (Cancelamento):** Permitir que o cliente cancele o projeto se ainda estiver no status `Aberto`, recebendo 100% do ETH de volta.
- **FR-06 (Disputa e Resolução):** Permitir abertura de disputa por cliente ou freelancer se em andamento/entregue. Apenas o dono (`apenasDono`) pode resolver a disputa definindo a divisão percentual dos fundos.
- **FR-07 (Gestão de Taxas):** Permitir que o dono consulte e realize o saque do montante acumulado das taxas da plataforma.
- **FR-08 (Consultas e Paginação):** Fornecer funções de leitura para consultar detalhes de um projeto, obter o total de projetos e listar IDs de projetos de determinado usuário com limite de paginação.

## 3. Non-Functional & Solidity Requirements (Os 7 Grupos)
- **NFR-01 (Tipos de Dados):** Usar `uint256`, `int256`, `bool`, `address payable`, `string`, `bytes32`, `constant` (taxa de 2%) e `immutable` (dono).
- **NFR-02 (Funções):** Cobrir todas as visibilidades (`public`, `external`, `internal`, `private`), modificadores de mutabilidade (`view`, `pure`, `payable`) e `constructor`.
- **NFR-03 (Estruturas de Controle):** Uso de `require`, `if/else` e laço `for` com limite controlado.
- **NFR-04 (Arrays e Mappings):** Uso de array dinâmico (`uint256[]`), mapping simples (`id => Projeto`) e mapping aninhado (`cliente => freelancer => bool`).
- **NFR-05 (Structs e Enums):** Struct `Projeto` com mais de 3 campos e `enum StatusProjeto` com os estados (`Aberto`, `EmAndamento`, `Entregue`, `Finalizado`, `Cancelado`, `EmDisputa`).
- **NFR-06 (Modificadores):** Ao menos dois modificadores próprios, sendo um com parâmetro (`noStatus(uint256 id, StatusProjeto statusEsperado)` e `apenasDono`).
- **NFR-07 (Eventos e Erros):** Eventos com parâmetros `indexed` (`ProjetoCriado`, `ProjetoFinalizado`, `StatusAlterado`) e erros personalizados (`error ValorInvalido()`, `error StatusIncorreto(...)`, `error AcessoNegado()`).
- **NFR-08 (Documentação NatSpec):** Comentários no padrão NatSpec em todas as funções principais e marcações `// [Recurso: ...]`.

## 4. Acceptance Criteria
- [ ] O contrato compila sem erros ou avisos críticos no compilador Solidity 0.8.24+.
- [ ] Todas as 7 categorias de recursos estão presentes, funcionais e devidamente anotadas com comentários `// [Recurso: ...]`.
- [ ] O contrato protege contra reentrância na transferência de ETH (Checks-Effects-Interactions).
- [ ] Testes automatizados cobrem o fluxo completo de sucesso e os casos de reversão (erros customizados).

## 5. Out of Scope
- Frontend web e integração com Web3.js (serão tratados na próxima track).
- Tokens ERC-20 (o escrow utiliza ETH nativo conforme o Guia).
