// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartFreela
 * @notice Contrato descentralizado de custódia (escrow) para prestação de serviços freelance.
 * @dev Atende integralmente aos 7 grupos de recursos exigidos no Guia do Trabalho Prático da disciplina.
 */
contract SmartFreela {
    // =========================================================================
    // 1. TIPOS DE DADOS
    // =========================================================================
    // [Recurso: TiposDeDados]
    address public immutable owner;
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 2; // 2% de taxa retida na liquidação
    uint256 private constant MAX_PROJECT_TITLE_LEN = 50; 
    uint256 private constant MAX_PROJECT_DESC_LEN = 1500;
    int256 public constant DEFAULT_INITIAL_REPUTATION = 100; // Reputação base (uso funcional de int256)
    uint256 public totalProjects;
    uint256 public accumulatedFees;
    bool public isActive = true; // Circuit breaker operacional do contrato

    // =========================================================================
    // 2. STRUCTS E ENUMS
    // =========================================================================
    // [Recurso: StructsEEnums]
    enum ProjectStatus {
        Open,       // 0: Aguardando aceite de um freelancer
        InProgress, // 1: Aceito e em desenvolvimento
        Delivered,  // 2: Trabalho concluído e aguardando aprovação
        Completed,  // 3: Aprovado e pago ao freelancer
        Canceled,   // 4: Cancelado (antes do início ou por estouro de prazo)
        InDispute   // 5: Em mediação pelo administrador
    }

    struct Project {
        uint256 id;
        address payable client;
        address payable freelancer;
        uint256 amount;
        string title;
        string description;
        string deliveryUrl;   // Link legível do entregável para auditoria do cliente/mediador
        bytes32 deliveryHash; // Impressão digital Keccak-256 (bytes32) do entregável
        ProjectStatus status;
        uint256 createdAt;
        uint256 dueDate;      // Prazo limite (timestamp) para entrega
        uint256 completedAt;
    }

    // =========================================================================
    // 3. ARRAYS E MAPPINGS
    // =========================================================================
    // [Recurso: ArraysEMappings]
    uint256[] private _allIds;
    mapping(uint256 => Project) public projects;
    // Mapping simples com int256 para variação de reputação on-chain
    mapping(address => int256) public reputationDelta;
    // Mapping aninhado: rastreia se um endereço participou de determinado projeto
    mapping(address => mapping(uint256 => bool)) public participatedProjects;

    // =========================================================================
    // 4. EVENTOS E ERROS PERSONALIZADOS
    // =========================================================================
    // [Recurso: EventosEErros]
    event ProjectCreated(
        uint256 indexed id,
        address indexed client,
        uint256 amount,
        uint256 dueDate
    );
    event ProjectAccepted(uint256 indexed id, address indexed freelancer);
    event ProjectDelivered(
        uint256 indexed id,
        bytes32 indexed deliveryHash,
        string deliveryUrl
    );
    event ProjectCompleted(
        uint256 indexed id,
        address indexed freelancer,
        uint256 paidAmount
    );
    event ProjectCanceled(uint256 indexed id, address indexed client);
    event DisputeOpened(uint256 indexed id, address indexed requester);
    event DisputeResolved(
        uint256 indexed id,
        uint256 freelancerAmount,
        uint256 clientAmount
    );
    event FeesWithdrawn(address indexed receiver, uint256 amount);
    event ContractStatusToggled(bool isActive);

    error InvalidAmount();
    error InvalidData();
    error AccessDenied();
    error IncorrectStatus(ProjectStatus current, ProjectStatus expected);
    error PaymentFailed();
    error InvalidPercentage();
    error ProjectNotFound();
    error DeadlineNotExpired(uint256 dueDate, uint256 currentTimestamp);
    error ContractPaused();

    // =========================================================================
    // 5. MODIFICADORES
    // =========================================================================
    // [Recurso: Modificadores]
    modifier onlyOwner() {
        if (msg.sender != owner) revert AccessDenied();
        _;
    }

    modifier inStatus(uint256 id, ProjectStatus expected) {
        if (projects[id].id == 0) revert ProjectNotFound();
        if (projects[id].status != expected)
            revert IncorrectStatus(projects[id].status, expected);
        _;
    }

    modifier onlyClient(uint256 id) {
        if (msg.sender != projects[id].client) revert AccessDenied();
        _;
    }

    modifier onlyFreelancer(uint256 id) {
        if (msg.sender != projects[id].freelancer) revert AccessDenied();
        _;
    }

    // =========================================================================
    // 6. CONSTRUTOR E FUNÇÕES
    // =========================================================================
    // [Recurso: Funcoes]
    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Cria um novo projeto em caução depositando ETH.
     * @param title Título descritivo do projeto.
     * @param description Especificações dos requisitos e entregáveis.
     * @param dueDate Timestamp limite para entrega do projeto.
     * @return newId Identificador único do projeto criado.
     */
    function createProject(
        string calldata title,
        string calldata description,
        uint256 dueDate
    ) external payable returns (uint256 newId) {
        // [Recurso: EstruturasDeControle]
        if (!isActive) revert ContractPaused();
        if (msg.value == 0) revert InvalidAmount();
        if (
            bytes(title).length == 0 ||
            bytes(title).length > MAX_PROJECT_TITLE_LEN ||
            bytes(description).length == 0 ||
            bytes(description).length > MAX_PROJECT_DESC_LEN ||
            dueDate <= block.timestamp
        ) revert InvalidData();

        totalProjects++;
        newId = totalProjects;

        projects[newId] = Project({
            id: newId,
            client: payable(msg.sender),
            freelancer: payable(address(0)),
            amount: msg.value,
            title: title,
            description: description,
            deliveryUrl: "",
            deliveryHash: bytes32(0),
            status: ProjectStatus.Open,
            createdAt: block.timestamp,
            dueDate: dueDate,
            completedAt: 0
        });

        _allIds.push(newId);
        participatedProjects[msg.sender][newId] = true;

        emit ProjectCreated(newId, msg.sender, msg.value, dueDate);
    }

    /**
     * @notice Consulta detalhes completos de um projeto pelo ID.
     * @param id Identificador do projeto.
     */
    function getProject(uint256 id) external view returns (Project memory) {
        if (projects[id].id == 0) revert ProjectNotFound();
        return projects[id];
    }

    /**
     * @notice Permite a um freelancer aceitar um projeto que esteja aberto.
     * @param id Identificador do projeto.
     */
    function acceptProject(
        uint256 id
    ) external inStatus(id, ProjectStatus.Open) {
        if (msg.sender == projects[id].client) revert AccessDenied();

        projects[id].freelancer = payable(msg.sender);
        projects[id].status = ProjectStatus.InProgress;
        participatedProjects[msg.sender][id] = true;

        emit ProjectAccepted(id, msg.sender);
    }

    /**
     * @notice Registra a entrega com a URL para auditoria do cliente e seu hash criptográfico bytes32.
     * @param id Identificador do projeto.
     * @param deliveryUrl Link do repositório, deploy ou arquivo entregue.
     * @param deliveryHash Hash Keccak-256 correspondente ao deliveryUrl.
     */
    function deliverProject(
        uint256 id,
        string calldata deliveryUrl,
        bytes32 deliveryHash
    ) external inStatus(id, ProjectStatus.InProgress) onlyFreelancer(id) {
        if (bytes(deliveryUrl).length == 0 || deliveryHash == bytes32(0)) {
            revert InvalidData();
        }
        // Garante on-chain a integridade entre o texto enviado e o hash bytes32
        if (keccak256(bytes(deliveryUrl)) != deliveryHash) {
            revert InvalidData();
        }

        projects[id].deliveryUrl = deliveryUrl;
        projects[id].deliveryHash = deliveryHash;
        projects[id].status = ProjectStatus.Delivered;

        emit ProjectDelivered(id, deliveryHash, deliveryUrl);
    }

    /**
     * @notice Cliente aprova a entrega realizada, bonifica a reputação e libera o pagamento ao freelancer.
     * @param id Identificador do projeto.
     */
    function approveAndComplete(
        uint256 id
    ) external inStatus(id, ProjectStatus.Delivered) onlyClient(id) {
        // Effects
        projects[id].status = ProjectStatus.Completed;
        projects[id].completedAt = block.timestamp;
        reputationDelta[projects[id].freelancer] += 10;

        uint256 fee = _calculateFee(projects[id].amount);
        uint256 netValue = projects[id].amount - fee;
        accumulatedFees += fee;

        // Interactions
        _processPayment(projects[id].freelancer, netValue);

        emit ProjectCompleted(id, projects[id].freelancer, netValue);
    }

    /**
     * @dev Processa transferência de ETH com validação de sucesso.
     */
    function _processPayment(
        address payable recipient,
        uint256 amount
    ) internal {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert PaymentFailed();
    }

    /**
     * @dev Calcula a taxa da plataforma em wei.
     */
    function _calculateFee(uint256 amount) private pure returns (uint256) {
        return (amount * PLATFORM_FEE_PERCENTAGE) / 100;
    }

    /**
     * @notice Calcula o valor líquido que o freelancer receberá após dedução da taxa.
     */
    function calculateNetValue(
        uint256 grossAmount
    ) public pure returns (uint256) {
        uint256 fee = _calculateFee(grossAmount);
        return grossAmount - fee;
    }

    /**
     * @notice Calcula a reputação atual de um usuário usando aritmética com sinal (int256).
     * @param user Endereço da carteira a consultar.
     */
    function getUserReputation(address user) external view returns (int256) {
        return DEFAULT_INITIAL_REPUTATION + reputationDelta[user];
    }

    /**
     * @notice Cancela um projeto e reembolsa 100% do ETH ao cliente.
     * @dev Permitido livremente se Open, ou se InProgress caso o prazo (dueDate) tenha expirado sem entrega.
     * @param id Identificador do projeto.
     */
    function cancelProject(uint256 id) external onlyClient(id) {
        if (projects[id].id == 0) revert ProjectNotFound();
        ProjectStatus currentStatus = projects[id].status;

        // [Recurso: EstruturasDeControle] - if / else if / else
        if (currentStatus == ProjectStatus.Open) {
            projects[id].status = ProjectStatus.Canceled;
        } else if (currentStatus == ProjectStatus.InProgress) {
            if (block.timestamp <= projects[id].dueDate) {
                revert DeadlineNotExpired(projects[id].dueDate, block.timestamp);
            }
            projects[id].status = ProjectStatus.Canceled;
            // Penaliza a reputação do freelancer por inadimplência de prazo
            reputationDelta[projects[id].freelancer] -= 15;
        } else {
            revert IncorrectStatus(currentStatus, ProjectStatus.Open);
        }

        projects[id].completedAt = block.timestamp;
        _processPayment(projects[id].client, projects[id].amount);

        emit ProjectCanceled(id, msg.sender);
    }

    /**
     * @notice Abre uma disputa para mediação caso as partes discordem.
     * @param id Identificador do projeto.
     */
    function openDispute(uint256 id) external {
        if (projects[id].id == 0) revert ProjectNotFound();
        if (
            msg.sender != projects[id].client &&
            msg.sender != projects[id].freelancer
        ) {
            revert AccessDenied();
        }
        if (
            projects[id].status != ProjectStatus.InProgress &&
            projects[id].status != ProjectStatus.Delivered
        ) {
            revert IncorrectStatus(
                projects[id].status,
                ProjectStatus.InProgress
            );
        }

        projects[id].status = ProjectStatus.InDispute;

        emit DisputeOpened(id, msg.sender);
    }

    /**
     * @notice O administrador resolve a disputa definindo a divisão percentual dos fundos.
     * @param id Identificador do projeto.
     * @param freelancerPercentage Percentual (0 a 100) destinado ao freelancer.
     */
    function resolveDispute(
        uint256 id,
        uint256 freelancerPercentage
    ) external onlyOwner inStatus(id, ProjectStatus.InDispute) {
        if (freelancerPercentage > 100) revert InvalidPercentage();

        projects[id].status = ProjectStatus.Completed;
        projects[id].completedAt = block.timestamp;

        if (freelancerPercentage >= 50) {
            reputationDelta[projects[id].freelancer] += 5;
        } else {
            reputationDelta[projects[id].freelancer] -= 10;
        }

        uint256 freelancerAmount = (projects[id].amount *
            freelancerPercentage) / 100;
        uint256 clientAmount = projects[id].amount - freelancerAmount;

        if (freelancerAmount > 0) {
            _processPayment(projects[id].freelancer, freelancerAmount);
        }
        if (clientAmount > 0) {
            _processPayment(projects[id].client, clientAmount);
        }

        emit DisputeResolved(id, freelancerAmount, clientAmount);
    }

    /**
     * @notice Permite ao dono retirar as taxas da plataforma acumuladas.
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert InvalidAmount();

        accumulatedFees = 0;
        _processPayment(payable(owner), amount);

        emit FeesWithdrawn(owner, amount);
    }

    /**
     * @notice Permite ao dono pausar ou reativar a criação de novos projetos (Circuit Breaker).
     */
    function toggleContractActive() external onlyOwner {
        isActive = !isActive;
        emit ContractStatusToggled(isActive);
    }

    /**
     * @notice Retorna os IDs dos projetos dos quais um usuário participou, com suporte a paginação.
     */
    function getUserProjects(
        address user,
        uint256 startIndex,
        uint256 limit
    ) external view returns (uint256[] memory ids) {
        require(limit > 0 && limit <= 50, "Limit must be between 1 and 50");
        uint256 total = totalProjects;
        if (startIndex >= total) {
            return new uint256[](0);
        }

        uint256 endIndex = startIndex + limit;
        if (endIndex > total) {
            endIndex = total;
        }

        uint256 count = 0;
        for (uint256 i = startIndex + 1; i <= endIndex; i++) {
            if (participatedProjects[user][i]) {
                count++;
            }
        }

        ids = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = startIndex + 1; i <= endIndex; i++) {
            if (participatedProjects[user][i]) {
                ids[idx] = i;
                idx++;
            }
        }
    }
}