const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartFreela Contract", function () {
  let SmartFreela;
  let smartFreela;
  let owner;
  let client;
  let freelancer;
  let stranger;

  beforeEach(async function () {
    [owner, client, freelancer, stranger] = await ethers.getSigners();
    SmartFreela = await ethers.getContractFactory("SmartFreela");
    smartFreela = await SmartFreela.deploy();
    await smartFreela.waitForDeployment();
  });

  describe("Deployment & Initial State", function () {
    it("should set the deployer as owner (immutable)", async function () {
      expect(await smartFreela.dono()).to.equal(owner.address);
    });

    it("should have TAXA_PLATAFORMA_PERCENTUAL as 2 (constant)", async function () {
      expect(await smartFreela.TAXA_PLATAFORMA_PERCENTUAL()).to.equal(2n);
    });

    it("should start with 0 total projects", async function () {
      expect(await smartFreela.totalProjetos()).to.equal(0n);
    });
  });

  describe("criarProjeto (Payable Escrow Creation)", function () {
    it("should revert if msg.value is zero", async function () {
      await expect(
        smartFreela.connect(client).criarProjeto("Landing Page", "Criar landing page em HTML/CSS", { value: 0 })
      ).to.be.revertedWithCustomError(smartFreela, "ValorInvalido");
    });

    it("should revert if title or description is empty", async function () {
      await expect(
        smartFreela.connect(client).criarProjeto("", "Descricao valida", { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(smartFreela, "DadosInvalidos");

      await expect(
        smartFreela.connect(client).criarProjeto("Titulo valido", "", { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(smartFreela, "DadosInvalidos");
    });

    it("should create project with status Aberto (0) and emit ProjetoCriado event", async function () {
      const deposit = ethers.parseEther("0.5");
      await expect(
        smartFreela.connect(client).criarProjeto("Smart Contract", "Desenvolver contrato em Solidity", { value: deposit })
      )
        .to.emit(smartFreela, "ProjetoCriado")
        .withArgs(1n, client.address, deposit);

      expect(await smartFreela.totalProjetos()).to.equal(1n);

      const proj = await smartFreela.obterProjeto(1n);
      expect(proj.id).to.equal(1n);
      expect(proj.cliente).to.equal(client.address);
      expect(proj.freelancer).to.equal(ethers.ZeroAddress);
      expect(proj.valor).to.equal(deposit);
      expect(proj.titulo).to.equal("Smart Contract");
      expect(proj.descricao).to.equal("Desenvolver contrato em Solidity");
      expect(proj.status).to.equal(0n); // StatusProjeto.Aberto
    });
  });

  describe("Lifecycle: Aceitar, Entregar e Aprovar", function () {
    const deposit = ethers.parseEther("1.0");

    beforeEach(async function () {
      await smartFreela.connect(client).criarProjeto("Website", "Construir site em HTML/CSS", { value: deposit });
    });

    it("should allow a freelancer to accept project and emit ProjetoAceito", async function () {
      await expect(smartFreela.connect(client).aceitarProjeto(1n)).to.be.revertedWithCustomError(
        smartFreela,
        "AcessoNegado"
      );

      await expect(smartFreela.connect(freelancer).aceitarProjeto(1n))
        .to.emit(smartFreela, "ProjetoAceito")
        .withArgs(1n, freelancer.address);

      const proj = await smartFreela.obterProjeto(1n);
      expect(proj.freelancer).to.equal(freelancer.address);
      expect(proj.status).to.equal(1n); // EmAndamento
    });

    it("should allow freelancer to submit deliverable and emit ProjetoEntregue", async function () {
      await smartFreela.connect(freelancer).aceitarProjeto(1n);

      const hashEntrega = ethers.keccak256(ethers.toUtf8Bytes("https://github.com/myrepo/commit/123"));

      await expect(
        smartFreela.connect(stranger).entregarProjeto(1n, hashEntrega)
      ).to.be.revertedWithCustomError(smartFreela, "AcessoNegado");

      await expect(
        smartFreela.connect(freelancer).entregarProjeto(1n, ethers.ZeroHash)
      ).to.be.revertedWithCustomError(smartFreela, "DadosInvalidos");

      await expect(smartFreela.connect(freelancer).entregarProjeto(1n, hashEntrega))
        .to.emit(smartFreela, "ProjetoEntregue")
        .withArgs(1n, hashEntrega);

      const proj = await smartFreela.obterProjeto(1n);
      expect(proj.hashEntrega).to.equal(hashEntrega);
      expect(proj.status).to.equal(2n); // Entregue
    });

    it("should allow client to approve deliverable and payout freelancer (net 98%) with CEI pattern", async function () {
      await smartFreela.connect(freelancer).aceitarProjeto(1n);
      const hashEntrega = ethers.keccak256(ethers.toUtf8Bytes("ipfs://QmHash123"));
      await smartFreela.connect(freelancer).entregarProjeto(1n, hashEntrega);

      // Stranger cannot approve
      await expect(
        smartFreela.connect(stranger).aprovarEFinalizar(1n)
      ).to.be.revertedWithCustomError(smartFreela, "AcessoNegado");

      const initialFreelancerBalance = await ethers.provider.getBalance(freelancer.address);

      // Taxa = 2% de 1.0 ETH = 0.02 ETH. Liquido = 0.98 ETH.
      const taxaEsperada = ethers.parseEther("0.02");
      const liquidoEsperado = ethers.parseEther("0.98");

      await expect(smartFreela.connect(client).aprovarEFinalizar(1n))
        .to.emit(smartFreela, "ProjetoFinalizado")
        .withArgs(1n, freelancer.address, liquidoEsperado);

      const finalFreelancerBalance = await ethers.provider.getBalance(freelancer.address);
      expect(finalFreelancerBalance - initialFreelancerBalance).to.equal(liquidoEsperado);

      expect(await smartFreela.taxasAcumuladas()).to.equal(taxaEsperada);

      const proj = await smartFreela.obterProjeto(1n);
      expect(proj.status).to.equal(3n); // Finalizado
      expect(proj.finalizadoEm).to.be.gt(0n);
    });
  });
});
