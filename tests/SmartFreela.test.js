const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SmartFreela Escrow Contract", function () {
  let smartFreela;
  let owner, client, freelancer, otherUser;
  const depositAmount = ethers.parseEther("1.0");
  const deliveryUrl = "https://github.com/JlCastr0/smart-freela";
  const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes(deliveryUrl));

  beforeEach(async function () {
    [owner, client, freelancer, otherUser] = await ethers.getSigners();
    const SmartFreela = await ethers.getContractFactory("SmartFreela");
    smartFreela = await SmartFreela.connect(owner).deploy();
    await smartFreela.waitForDeployment();
  });

  async function getFutureDueDate(days = 7) {
    const latest = await time.latest();
    return latest + days * 24 * 60 * 60;
  }

  describe("1. Criação e Validação de Projetos", function () {
    it("Deve criar um projeto válido com dueDate no futuro e reter o ETH", async function () {
      const dueDate = await getFutureDueDate(5);

      await expect(
        smartFreela.connect(client).createProject("Landing Page", "HTML/CSS/JS", dueDate, {
          value: depositAmount,
        })
      )
        .to.emit(smartFreela, "ProjectCreated")
        .withArgs(1n, client.address, depositAmount, dueDate);

      const project = await smartFreela.getProject(1);
      expect(project.title).to.equal("Landing Page");
      expect(project.amount).to.equal(depositAmount);
      expect(project.status).to.equal(0n); // Open
    });

    it("Deve reverter ao criar projeto com valor 0 ou dueDate no passado", async function () {
      const dueDate = await getFutureDueDate(5);
      const pastDate = (await time.latest()) - 100;

      await expect(
        smartFreela.connect(client).createProject("Titulo", "Desc", dueDate, { value: 0 })
      ).to.be.revertedWithCustomError(smartFreela, "InvalidAmount");

      await expect(
        smartFreela.connect(client).createProject("Titulo", "Desc", pastDate, { value: depositAmount })
      ).to.be.revertedWithCustomError(smartFreela, "InvalidData");
    });

    it("Deve bloquear a criação quando pausado pelo Circuit Breaker (isActive)", async function () {
      const dueDate = await getFutureDueDate(5);
      await smartFreela.connect(owner).toggleContractActive();
      expect(await smartFreela.isActive()).to.equal(false);

      await expect(
        smartFreela.connect(client).createProject("Titulo", "Desc", dueDate, { value: depositAmount })
      ).to.be.revertedWithCustomError(smartFreela, "ContractPaused");
    });
  });

  describe("2. Fluxo Completo: Aceite, Entrega Auditável, Aprovação e Reputação", function () {
    it("Deve executar o ciclo completo, validar URL + Hash, pagar 98% e somar +10 de reputação", async function () {
      const dueDate = await getFutureDueDate(7);
      await smartFreela.connect(client).createProject("dApp Web3", "Escrow Sepolia", dueDate, {
        value: depositAmount,
      });

      // Aceite
      await expect(smartFreela.connect(freelancer).acceptProject(1))
        .to.emit(smartFreela, "ProjectAccepted")
        .withArgs(1n, freelancer.address);

      // Rejeita hash que não corresponde à URL enviada
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("https://link-falso.com"));
      await expect(
        smartFreela.connect(freelancer).deliverProject(1, deliveryUrl, wrongHash)
      ).to.be.revertedWithCustomError(smartFreela, "InvalidData");

      // Entrega válida com URL e Hash bytes32 correspondente
      await expect(smartFreela.connect(freelancer).deliverProject(1, deliveryUrl, deliveryHash))
        .to.emit(smartFreela, "ProjectDelivered")
        .withArgs(1n, deliveryHash, deliveryUrl);

      const deliveredProj = await smartFreela.getProject(1);
      expect(deliveredProj.deliveryUrl).to.equal(deliveryUrl);
      expect(deliveredProj.deliveryHash).to.equal(deliveryHash);

      // Aprovação e liquidação (98% freelancer, 2% taxa)
      const expectedNet = ethers.parseEther("0.98");
      const expectedFee = ethers.parseEther("0.02");

      await expect(
        smartFreela.connect(client).approveAndComplete(1)
      ).to.changeEtherBalance(freelancer, expectedNet);

      expect(await smartFreela.accumulatedFees()).to.equal(expectedFee);
      expect(await smartFreela.getUserReputation(freelancer.address)).to.equal(110n); // 100 + 10
    });
  });

  describe("3. Cancelamento Normal e Cancelamento por Estouro de Prazo (Due Date)", function () {
    it("Deve permitir ao cliente cancelar projeto Open com 100% de reembolso", async function () {
      const dueDate = await getFutureDueDate(3);
      await smartFreela.connect(client).createProject("Site", "Escopo", dueDate, {
        value: depositAmount,
      });

      await expect(
        smartFreela.connect(client).cancelProject(1)
      ).to.changeEtherBalance(client, depositAmount);
    });

    it("Deve impedir cancelamento em andamento antes do prazo e permitir após expirar o dueDate (-15 reputação)", async function () {
      const dueDate = await getFutureDueDate(2);
      await smartFreela.connect(client).createProject("API", "Backend", dueDate, {
        value: depositAmount,
      });
      await smartFreela.connect(freelancer).acceptProject(1);

      // Tentativa antes do vencimento deve reverter com DeadlineNotExpired
      await expect(
        smartFreela.connect(client).cancelProject(1)
      ).to.be.revertedWithCustomError(smartFreela, "DeadlineNotExpired");

      // Avança o tempo da blockchain para além do dueDate
      await time.increaseTo(dueDate + 60);

      // Agora o cliente pode cancelar por atraso e recuperar 100% do ETH
      await expect(
        smartFreela.connect(client).cancelProject(1)
      ).to.changeEtherBalance(client, depositAmount);

      expect(await smartFreela.getUserReputation(freelancer.address)).to.equal(85n); // 100 - 15
    });
  });

  describe("4. Disputas, Saque de Taxas e Paginação", function () {
    it("Deve permitir abrir disputa, mediar com divisão percentual e sacar taxas", async function () {
      const dueDate = await getFutureDueDate(5);
      await smartFreela.connect(client).createProject("App", "Mobile", dueDate, {
        value: depositAmount,
      });
      await smartFreela.connect(freelancer).acceptProject(1);

      await expect(smartFreela.connect(client).openDispute(1))
        .to.emit(smartFreela, "DisputeOpened")
        .withArgs(1n, client.address);

      // Dono resolve disputa com 40% para freelancer e 60% para cliente
      await expect(
        smartFreela.connect(owner).resolveDispute(1, 40)
      ).to.changeEtherBalances(
        [freelancer, client],
        [ethers.parseEther("0.4"), ethers.parseEther("0.6")]
      );

      // Como recebeu < 50%, reputação do freelancer cai 10 pontos (90)
      expect(await smartFreela.getUserReputation(freelancer.address)).to.equal(90n);

      // Verifica listagem paginada
      const userIds = await smartFreela.getUserProjects(client.address, 0, 10);
      expect(userIds.length).to.equal(1);
      expect(userIds[0]).to.equal(1n);
    });
  });
});