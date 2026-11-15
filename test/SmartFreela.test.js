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
});
