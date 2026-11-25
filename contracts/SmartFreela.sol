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
    uint256 public constant PLATFORM_FEE_PERCENTAGE = 2; // 2% de taxa retida sobre repasses ao freelancer
    uint256 public constant MIN_DELIVERY_WINDOW = 1 hours;
    uint256 public constant MAX_DELIVERY_WINDOW = 365 days;
    uint256 public constant REVIEW_WINDOW = 7 days; // Prazo de revisão do cliente após entrega
    uint256 private constant MAX_PROJECT_TITLE_LEN = 80;
    uint256 private constant MAX_PROJECT_DESC_LEN = 1500;
    uint256 private constant MAX_DELIVERY_URL_LEN = 2048;
    int256 public constant DEFAULT_INITIAL_REPUTATION = 100;

    uint256 public totalProjects;
    uint256 public accumulatedFees;
    bool public isActive = true;
    bool private _locked;

    // =========================================================================
    // 2. STRUCTS E ENUMS
    // =========================================================================
    // [Recurso: StructsEEnums]
    enum ProjectStatus {
        Open, // 0: Aguardando aceite de um freelancer
        InProgress, // 1: Aceito e em desenvolvimento
        Delivered, // 2: Trabalho concluído e aguardando aprovação
        Completed, // 3: Aprovado e pago ao freelancer
        Canceled, // 4: Cancelado (antes do início ou por estouro de prazo)
        InDispute // 5: Em mediação pelo administrador
    }

    struct Project {
        uint256 id;
        address payable client;
        address payable freelancer;
        uint256 amount;
        string title;
        string description;
        string deliveryUrl; // Link legível do entregável para auditoria do cliente/mediador
        bytes32 deliveryHash; // Impressão digital Keccak-256 (bytes32) do entregável
        ProjectStatus status;
        uint256 createdAt;
        uint256 dueDate; // Prazo limite (timestamp) para entrega
        uint256 completedAt;
    }

    // =========================================================================
    // 3. ARRAYS E MAPPINGS
    // =========================================================================
    // [Recurso: ArraysEMappings]
    uint256[] private _allIds;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => uint256) public deliveredAt; // janela de revisão pos-entrega
    mapping(address => int256) public reputationDelta; // variação de reputação on-chain
    mapping(address => mapping(uint256 => bool)) public participatedProjects; // rastreia se um endereço participou de determinado projeto

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
    error ReviewWindowNotExpired(
        uint256 reviewDeadline,
        uint256 currentTimestamp
    );
    error ContractPaused();

    // =========================================================================
    // 5. MODIFICADORES
    // =========================================================================
    // [Recurso: Modificadores]
    modifier onlyOwner() {
        if (msg.sender != owner) revert AccessDenied();
        _;
    }

    modifier nonReentrant() {
        if (_locked) revert AccessDenied();
        _locked = true;
        _;
        _locked = false;
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
            dueDate < block.timestamp + MIN_DELIVERY_WINDOW ||
            dueDate > block.timestamp + MAX_DELIVERY_WINDOW
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
        // Garante on-chain a integridade entre o texto enviado e o hash bytes32
        if (
            bytes(deliveryUrl).length == 0 ||
            bytes(deliveryUrl).length > MAX_DELIVERY_URL_LEN ||
            deliveryHash == bytes32(0) ||
            keccak256(bytes(deliveryUrl)) != deliveryHash
        ) {
            revert InvalidData();
        }

        projects[id].deliveryUrl = deliveryUrl;
        projects[id].deliveryHash = deliveryHash;
        projects[id].status = ProjectStatus.Delivered;
        deliveredAt[id] = block.timestamp;

        emit ProjectDelivered(id, deliveryHash, deliveryUrl);
    }

    /**
     * @notice Cliente aprova a entrega realizada, bonifica a reputação e libera o pagamento ao freelancer.
     * @param id Identificador do projeto.
     */
    function approveAndComplete(
        uint256 id
    )
        external
        nonReentrant
        inStatus(id, ProjectStatus.Delivered)
        onlyClient(id)
    {
        _settleToFreelancer(id);
    }

    /**
     * @notice Permite ao freelancer concluir e receber o pagamento caso o prazo de revisão
     * do cliente (REVIEW_WINDOW) expire após a entrega sem abertura de disputa.
     */
    function claimAfterReviewTimeout(
        uint256 id
    )
        external
        nonReentrant
        inStatus(id, ProjectStatus.Delivered)
        onlyFreelancer(id)
    {
        uint256 baseTimestamp = deliveredAt[id];
        uint256 reviewDeadline = baseTimestamp + REVIEW_WINDOW;
        if (baseTimestamp == 0 || block.timestamp <= reviewDeadline) {
            revert ReviewWindowNotExpired(reviewDeadline, block.timestamp);
        }

        _settleToFreelancer(id);
    }

    function _settleToFreelancer(uint256 id) private {
        Project storage p = projects[id];
        p.status = ProjectStatus.Completed;
        p.completedAt = block.timestamp;
        reputationDelta[p.freelancer] += 10;

        uint256 fee = _calculateFee(p.amount);
        uint256 netValue = p.amount - fee;
        accumulatedFees += fee;

        _processPayment(p.freelancer, netValue);

        emit ProjectCompleted(id, p.freelancer, netValue);
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
    function cancelProject(uint256 id) external nonReentrant onlyClient(id) {
        if (projects[id].id == 0) revert ProjectNotFound();
        Project storage p = projects[id];
        ProjectStatus currentStatus = p.status;

        if (currentStatus == ProjectStatus.Open) {
            p.status = ProjectStatus.Canceled;
        } else if (currentStatus == ProjectStatus.InProgress) {
            if (block.timestamp <= p.dueDate) {
                revert DeadlineNotExpired(p.dueDate, block.timestamp);
            }
            p.status = ProjectStatus.Canceled;
            // Penaliza a reputação do freelancer por inadimplência de prazo
            reputationDelta[p.freelancer] -= 15;
        } else {
            revert IncorrectStatus(currentStatus, ProjectStatus.Open);
        }

        p.completedAt = block.timestamp;
        _processPayment(p.client, p.amount);

        emit ProjectCanceled(id, msg.sender);
    }

    /**
     * @notice Abre uma disputa para mediação caso as partes discordem.
     * @param id Identificador do projeto.
     */
    function openDispute(uint256 id) external {
        if (projects[id].id == 0) revert ProjectNotFound();
        Project storage p = projects[id];

        if (msg.sender != p.client && msg.sender != p.freelancer) {
            revert AccessDenied();
        }
        if (
            p.status != ProjectStatus.InProgress &&
            p.status != ProjectStatus.Delivered
        ) {
            revert IncorrectStatus(p.status, ProjectStatus.InProgress);
        }

        p.status = ProjectStatus.InDispute;

        emit DisputeOpened(id, msg.sender);
    }

    /**
     * @notice O administrador resolve a disputa definindo a divisão percentual dos fundos.
     * @dev Mantém simetria econômica: taxa de plataforma incide apenas sobre o repasse ao freelancer.
     * @param id Identificador do projeto.
     * @param freelancerPercentage Percentual (0 a 100) destinado ao freelancer.
     */
    function resolveDispute(
        uint256 id,
        uint256 freelancerPercentage
    ) external nonReentrant onlyOwner inStatus(id, ProjectStatus.InDispute) {
        if (freelancerPercentage > 100) revert InvalidPercentage();

        Project storage p = projects[id];
        p.status = ProjectStatus.Completed;
        p.completedAt = block.timestamp;

        if (freelancerPercentage >= 50) {
            reputationDelta[p.freelancer] += 5;
        } else {
            reputationDelta[p.freelancer] -= 10;
        }

        uint256 grossFreelancerShare = (p.amount * freelancerPercentage) / 100;
        uint256 clientAmount = p.amount - grossFreelancerShare;

        uint256 fee = grossFreelancerShare > 0
            ? _calculateFee(grossFreelancerShare)
            : 0;
        uint256 netFreelancerAmount = grossFreelancerShare - fee;

        if (fee > 0) {
            accumulatedFees += fee;
        }
        if (netFreelancerAmount > 0) {
            _processPayment(p.freelancer, netFreelancerAmount);
        }
        if (clientAmount > 0) {
            _processPayment(p.client, clientAmount);
        }

        emit DisputeResolved(id, netFreelancerAmount, clientAmount);
    }

    /**
     * @notice Permite ao dono retirar as taxas da plataforma acumuladas.
     */
    function withdrawFees() external nonReentrant onlyOwner {
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
