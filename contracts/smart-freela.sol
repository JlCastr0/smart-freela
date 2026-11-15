// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartFreela
 * @notice Contrato descentralizado de custódia (escrow) para prestação de serviços freelance.
 * @dev Atende aos 7 grupos de recursos exigidos no Guia do Trabalho Prático da disciplina.
 */
contract SmartFreela {
    // =========================================================================
    // 1. TIPOS DE DADOS
    // =========================================================================
    // [Recurso: TiposDeDados]
    address public immutable dono;
    uint256 public constant TAXA_PLATAFORMA_PERCENTUAL = 2; // 2% de taxa retida na liquidação
    uint256 public totalProjetos;
    uint256 public taxasAcumuladas;
    int256 public immutable reputacaoInicialPadrao = 100; // Exemplo de int para métrica de reputação
    bool public ativo = true;

    // =========================================================================
    // 2. STRUCTS E ENUMS
    // =========================================================================
    // [Recurso: StructsEEnums]
    enum StatusProjeto {
        Aberto,       // 0: Aguardando aceite de um freelancer
        EmAndamento,  // 1: Aceito e em desenvolvimento
        Entregue,     // 2: Trabalho concluído e aguardando aprovação
        Finalizado,   // 3: Aprovado e pago ao freelancer
        Cancelado,    // 4: Cancelado pelo cliente antes de iniciar (ETH devolvido)
        EmDisputa     // 5: Em mediação pelo administrador
    }

    struct Projeto {
        uint256 id;
        address payable cliente;
        address payable freelancer;
        uint256 valor;
        string titulo;
        string descricao;
        bytes32 hashEntrega;
        StatusProjeto status;
        uint256 criadoEm;
        uint256 finalizadoEm;
    }

    // =========================================================================
    // 3. ARRAYS E MAPPINGS
    // =========================================================================
    // [Recurso: ArraysEMappings]
    uint256[] private _todosOsIds;
    mapping(uint256 => Projeto) public projetos;
    // Mapping aninhado: rastreia se um endereço participou de determinado projeto
    mapping(address => mapping(uint256 => bool)) public projetosParticipados;

    // =========================================================================
    // 4. EVENTOS E ERROS PERSONALIZADOS
    // =========================================================================
    // [Recurso: EventosEErros]
    event ProjetoCriado(uint256 indexed id, address indexed cliente, uint256 valor);
    event ProjetoAceito(uint256 indexed id, address indexed freelancer);
    event ProjetoEntregue(uint256 indexed id, bytes32 indexed hashEntrega);
    event ProjetoFinalizado(uint256 indexed id, address indexed freelancer, uint256 valorPago);
    event ProjetoCancelado(uint256 indexed id, address indexed cliente);
    event DisputaAberta(uint256 indexed id, address indexed solicitante);
    event DisputaResolvida(uint256 indexed id, uint256 valorFreelancer, uint256 valorCliente);
    event TaxasSacadas(address indexed recebedor, uint256 valor);

    error ValorInvalido();
    error DadosInvalidos();
    error AcessoNegado();
    error StatusIncorreto(StatusProjeto atual, StatusProjeto esperado);
    error FalhaNoPagamento();
    error PercentualInvalido();
    error ProjetoInexistente();

    // =========================================================================
    // 5. MODIFICADORES
    // =========================================================================
    // [Recurso: Modificadores]
    modifier apenasDono() {
        if (msg.sender != dono) revert AcessoNegado();
        _;
    }

    modifier noStatus(uint256 id, StatusProjeto esperado) {
        if (projetos[id].id == 0) revert ProjetoInexistente();
        if (projetos[id].status != esperado) revert StatusIncorreto(projetos[id].status, esperado);
        _;
    }

    modifier apenasCliente(uint256 id) {
        if (msg.sender != projetos[id].cliente) revert AcessoNegado();
        _;
    }

    modifier apenasFreelancer(uint256 id) {
        if (msg.sender != projetos[id].freelancer) revert AcessoNegado();
        _;
    }

    // =========================================================================
    // 6. CONSTRUTOR E FUNÇÕES
    // =========================================================================
    // [Recurso: Funcoes]
    constructor() {
        dono = msg.sender;
    }

    /**
     * @notice Cria um novo projeto em caução depositando ETH.
     * @param titulo Título descritivo do projeto.
     * @param descricao Especificações dos requisitos e entregáveis.
     * @return novoId Identificador único do projeto criado.
     */
    function criarProjeto(
        string calldata titulo,
        string calldata descricao
    ) external payable returns (uint256 novoId) {
        // [Recurso: EstruturasDeControle]
        if (msg.value == 0) revert ValorInvalido();
        if (bytes(titulo).length == 0 || bytes(descricao).length == 0) revert DadosInvalidos();

        totalProjetos++;
        novoId = totalProjetos;

        projetos[novoId] = Projeto({
            id: novoId,
            cliente: payable(msg.sender),
            freelancer: payable(address(0)),
            valor: msg.value,
            titulo: titulo,
            descricao: descricao,
            hashEntrega: bytes32(0),
            status: StatusProjeto.Aberto,
            criadoEm: block.timestamp,
            finalizadoEm: 0
        });

        _todosOsIds.push(novoId);
        projetosParticipados[msg.sender][novoId] = true;

        emit ProjetoCriado(novoId, msg.sender, msg.value);
    }

    /**
     * @notice Consulta detalhes completos de um projeto pelo ID.
     * @param id Identificador do projeto.
     * @return Dados da struct Projeto correspondente.
     */
    function obterProjeto(uint256 id) external view returns (Projeto memory) {
        if (projetos[id].id == 0) revert ProjetoInexistente();
        return projetos[id];
    }

    /**
     * @notice Permite a um freelancer aceitar um projeto que esteja aberto.
     * @param id Identificador do projeto a ser aceito.
     */
    function aceitarProjeto(uint256 id) external noStatus(id, StatusProjeto.Aberto) {
        if (msg.sender == projetos[id].cliente) revert AcessoNegado();

        projetos[id].freelancer = payable(msg.sender);
        projetos[id].status = StatusProjeto.EmAndamento;
        projetosParticipados[msg.sender][id] = true;

        emit ProjetoAceito(id, msg.sender);
    }

    /**
     * @notice Registra o envio da entrega com hash criptográfico comprobatório.
     * @param id Identificador do projeto.
     * @param hashEntrega Hash SHA-256 ou CID do IPFS/Git representando o trabalho.
     */
    function entregarProjeto(
        uint256 id,
        bytes32 hashEntrega
    ) external noStatus(id, StatusProjeto.EmAndamento) apenasFreelancer(id) {
        if (hashEntrega == bytes32(0)) revert DadosInvalidos();

        projetos[id].hashEntrega = hashEntrega;
        projetos[id].status = StatusProjeto.Entregue;

        emit ProjetoEntregue(id, hashEntrega);
    }

    /**
     * @notice Cliente aprova a entrega realizada e libera o pagamento ao freelancer.
     * @dev Implementa o padrão Checks-Effects-Interactions contra reentrância.
     * @param id Identificador do projeto a ser aprovado.
     */
    function aprovarEFinalizar(
        uint256 id
    ) external noStatus(id, StatusProjeto.Entregue) apenasCliente(id) {
        // Effects
        projetos[id].status = StatusProjeto.Finalizado;
        projetos[id].finalizadoEm = block.timestamp;

        uint256 taxa = _calcularTaxa(projetos[id].valor);
        uint256 valorLiquido = projetos[id].valor - taxa;
        taxasAcumuladas += taxa;

        // Interactions
        _processarPagamento(projetos[id].freelancer, valorLiquido);

        emit ProjetoFinalizado(id, projetos[id].freelancer, valorLiquido);
    }

    /**
     * @dev Processa transferência de ETH com validação de sucesso.
     * [Recurso: Funcoes] - visibilidade internal
     * @param destinatario Endereço da carteira que receberá os fundos.
     * @param quantia Valor em wei a ser transferido.
     */
    function _processarPagamento(address payable destinatario, uint256 quantia) internal {
        (bool sucesso, ) = destinatario.call{value: quantia}("");
        if (!sucesso) revert FalhaNoPagamento();
    }

    /**
     * @dev Calcula a taxa da plataforma em wei.
     * [Recurso: Funcoes] - visibilidade private pure
     * @param valor Valor total sobre o qual a taxa percentual incidirá.
     * @return Valor da taxa calculada em wei.
     */
    function _calcularTaxa(uint256 valor) private pure returns (uint256) {
        return (valor * TAXA_PLATAFORMA_PERCENTUAL) / 100;
    }

    /**
     * @notice Calcula o valor líquido que o freelancer receberá após dedução da taxa.
     * [Recurso: Funcoes] - visibilidade public pure
     * @param valorBruto Valor bruto original depositado em caução.
     * @return Valor líquido a ser transferido ao freelancer.
     */
    function calcularValorLiquido(uint256 valorBruto) public pure returns (uint256) {
        uint256 taxa = _calcularTaxa(valorBruto);
        return valorBruto - taxa;
    }

    /**
     * @notice Permite ao cliente cancelar um projeto que ainda está Aberto, recebendo 100% do ETH de volta.
     * @param id Identificador do projeto.
     */
    function cancelarProjeto(uint256 id) external noStatus(id, StatusProjeto.Aberto) apenasCliente(id) {
        projetos[id].status = StatusProjeto.Cancelado;
        projetos[id].finalizadoEm = block.timestamp;

        _processarPagamento(projetos[id].cliente, projetos[id].valor);

        emit ProjetoCancelado(id, msg.sender);
    }

    /**
     * @notice Abre uma disputa para mediação caso as partes discordem.
     * @param id Identificador do projeto.
     */
    function abrirDisputa(uint256 id) external {
        if (projetos[id].id == 0) revert ProjetoInexistente();
        if (msg.sender != projetos[id].cliente && msg.sender != projetos[id].freelancer) {
            revert AcessoNegado();
        }
        if (
            projetos[id].status != StatusProjeto.EmAndamento &&
            projetos[id].status != StatusProjeto.Entregue
        ) {
            revert StatusIncorreto(projetos[id].status, StatusProjeto.EmAndamento);
        }

        projetos[id].status = StatusProjeto.EmDisputa;

        emit DisputaAberta(id, msg.sender);
    }

    /**
     * @notice O administrador resolve a disputa definindo a divisão percentual dos fundos.
     * @param id Identificador do projeto em disputa.
     * @param percentualFreelancer Percentual (0 a 100) destinado ao freelancer.
     */
    function resolverDisputa(
        uint256 id,
        uint256 percentualFreelancer
    ) external apenasDono noStatus(id, StatusProjeto.EmDisputa) {
        if (percentualFreelancer > 100) revert PercentualInvalido();

        projetos[id].status = StatusProjeto.Finalizado;
        projetos[id].finalizadoEm = block.timestamp;

        uint256 valorFreelancer = (projetos[id].valor * percentualFreelancer) / 100;
        uint256 valorCliente = projetos[id].valor - valorFreelancer;

        if (valorFreelancer > 0) {
            _processarPagamento(projetos[id].freelancer, valorFreelancer);
        }
        if (valorCliente > 0) {
            _processarPagamento(projetos[id].cliente, valorCliente);
        }

        emit DisputaResolvida(id, valorFreelancer, valorCliente);
    }

    /**
     * @notice Permite ao dono retirar as taxas da plataforma acumuladas.
     */
    function sacarTaxas() external apenasDono {
        uint256 quantia = taxasAcumuladas;
        if (quantia == 0) revert ValorInvalido();

        taxasAcumuladas = 0;
        _processarPagamento(payable(dono), quantia);

        emit TaxasSacadas(dono, quantia);
    }

    /**
     * @notice Retorna os IDs dos projetos dos quais um usuário participou, com suporte a paginação.
     * @dev Usa laço for com limite controlado para prevenção de estouro de gas.
     * [Recurso: EstruturasDeControle]
     * @param usuario Endereço da carteira a consultar.
     * @param inicio Índice de início para a busca.
     * @param limite Quantidade máxima de itens a retornar (máx 50).
     */
    function listarProjetosDoUsuario(
        address usuario,
        uint256 inicio,
        uint256 limite
    ) external view returns (uint256[] memory ids) {
        require(limite > 0 && limite <= 50, "Limite deve ser entre 1 e 50");
        uint256 total = totalProjetos;
        if (inicio >= total) {
            return new uint256[](0);
        }

        uint256 fim = inicio + limite;
        if (fim > total) {
            fim = total;
        }

        uint256 contagem = 0;
        for (uint256 i = inicio + 1; i <= fim; i++) {
            if (projetosParticipados[usuario][i]) {
                contagem++;
            }
        }

        ids = new uint256[](contagem);
        uint256 idx = 0;
        for (uint256 i = inicio + 1; i <= fim; i++) {
            if (projetosParticipados[usuario][i]) {
                ids[idx] = i;
                idx++;
            }
        }
    }
}
