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
     */
    function obterProjeto(uint256 id) external view returns (Projeto memory) {
        if (projetos[id].id == 0) revert ProjetoInexistente();
        return projetos[id];
    }

    /**
     * @notice Permite a um freelancer aceitar um projeto que esteja aberto.
     * @param id Identificador do projeto.
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
     * @param id Identificador do projeto.
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
     */
    function _processarPagamento(address payable destinatario, uint256 quantia) internal {
        (bool sucesso, ) = destinatario.call{value: quantia}("");
        if (!sucesso) revert FalhaNoPagamento();
    }

    /**
     * @dev Calcula a taxa da plataforma em wei.
     * [Recurso: Funcoes] - visibilidade private pure
     */
    function _calcularTaxa(uint256 valor) private pure returns (uint256) {
        return (valor * TAXA_PLATAFORMA_PERCENTUAL) / 100;
    }

    /**
     * @notice Calcula o valor líquido que o freelancer receberá após dedução da taxa.
     * [Recurso: Funcoes] - visibilidade public pure
     */
    function calcularValorLiquido(uint256 valorBruto) public pure returns (uint256) {
        uint256 taxa = _calcularTaxa(valorBruto);
        return valorBruto - taxa;
    }
}
