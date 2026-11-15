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

  describe("Cancelamento e Disputas", function () {
    const deposit = ethers.parseEther("1.0");

    it("should allow client to cancel project while Aberto and refund full deposit", async function () {
      await smartFreela.connect(client).criarProjeto("Logo", "Design de logotipo", { value: deposit });
      const initialClientBalance = await ethers.provider.getBalance(client.address);

      // Stranger cannot cancel
      await expect(smartFreela.connect(stranger).cancelarProjeto(1n)).to.be.revertedWithCustomError(
        smartFreela,
        "AcessoNegado"
      );

      const tx = await smartFreela.connect(client).cancelarProjeto(1n);
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const finalClientBalance = await ethers.provider.getBalance(client.address);
      expect(finalClientBalance + gasCost - initialClientBalance).to.equal(deposit);

      const proj = await smartFreela.obterProjeto(1n);
      expect(proj.status).to.equal(4n); // Cancelado
    });

    it("should handle dispute opening and resolution by owner", async function () {
      await smartFreela.connect(client).criarProjeto("App", "App mobile", { value: deposit });
      await smartFreela.connect(freelancer).aceitarProjeto(1n);

      // Stranger cannot open dispute
      await expect(smartFreela.connect(stranger).abrirDisputa(1n)).to.be.revertedWithCustomError(
        smartFreela,
        "AcessoNegado"
      );

      // Client or freelancer can open dispute
      await expect(smartFreela.connect(freelancer).abrirDisputa(1n))
        .to.emit(smartFreela, "DisputaAberta")
        .withArgs(1n, freelancer.address);

      let proj = await smartFreela.obterProjeto(1n);
      expect(proj.status).to.equal(5n); // EmDisputa

      // Only owner can resolve
      await expect(smartFreela.connect(client).resolverDisputa(1n, 50n)).to.be.revertedWithCustomError(
        smartFreela,
        "AcessoNegado"
      );

      // Percent must be <= 100
      await expect(smartFreela.connect(owner).resolverDisputa(1n, 101n)).to.be.revertedWithCustomError(
        smartFreela,
        "PercentualInvalido"
      );

      // Resolve 60% for freelancer, 40% for client
      const initialFreeBalance = await ethers.provider.getBalance(freelancer.address);
      const initialClientBalance = await ethers.provider.getBalance(client.address);

      await expect(smartFreela.connect(owner).resolverDisputa(1n, 60n)).to.emit(smartFreela, "DisputaResolvida");

      const finalFreeBalance = await ethers.provider.getBalance(freelancer.address);
      const finalClientBalance = await ethers.provider.getBalance(client.address);

      expect(finalFreeBalance - initialFreeBalance).to.equal(ethers.parseEther("0.6"));
      expect(finalClientBalance - initialClientBalance).to.equal(ethers.parseEther("0.4"));

      proj = await smartFreela.obterProjeto(1n);
      expect(proj.status).to.equal(3n); // Finalizado após resolução
    });
  });

  describe("Taxas da Plataforma e Paginação", function () {
    it("should allow owner to withdraw accumulated platform fees", async function () {
      const deposit = ethers.parseEther("1.0");
      await smartFreela.connect(client).criarProjeto("Job", "Desc", { value: deposit });
      await smartFreela.connect(freelancer).aceitarProjeto(1n);
      await smartFreela.connect(freelancer).entregarProjeto(1n, ethers.keccak256(ethers.toUtf8Bytes("work")));
      await smartFreela.connect(client).aprovarEFinalizar(1n);

      const taxaAcumulada = await smartFreela.taxasAcumuladas();
      expect(taxaAcumulada).to.equal(ethers.parseEther("0.02"));

      // Non-owner cannot withdraw
      await expect(smartFreela.connect(stranger).sacarTaxas()).to.be.revertedWithCustomError(
        smartFreela,
        "AcessoNegado"
      );

      const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
      const tx = await smartFreela.connect(owner).sacarTaxas();
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
      expect(finalOwnerBalance + gasCost - initialOwnerBalance).to.equal(taxaAcumulada);
      expect(await smartFreela.taxasAcumuladas()).to.equal(0n);
    });

    it("should paginate user projects correctly", async function () {
      const deposit = ethers.parseEther("0.1");
      await smartFreela.connect(client).criarProjeto("P1", "D1", { value: deposit });
      await smartFreela.connect(client).criarProjeto("P2", "D2", { value: deposit });
      await smartFreela.connect(client).criarProjeto("P3", "D3", { value: deposit });

      const projetosCliente = await smartFreela.listarProjetosDoUsuario(client.address, 0n, 10n);
      expect(projetosCliente.length).to.equal(3);
      expect(projetosCliente[0]).to.equal(1n);
      expect(projetosCliente[1]).to.equal(2n);
      expect(projetosCliente[2]).to.equal(3n);

      const pagina = await smartFreela.listarProjetosDoUsuario(client.address, 1n, 1n);
      expect(pagina.length).to.equal(1);
      expect(pagina[0]).to.equal(2n);
    });
  });
});
