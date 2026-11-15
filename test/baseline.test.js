const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Baseline Environment Test", function () {
  it("should deploy and verify network environment", async function () {
    const [deployer] = await ethers.getSigners();
    expect(deployer.address).to.be.properAddress;
    const balance = await ethers.provider.getBalance(deployer.address);
    expect(balance).to.be.gt(0n);
  });
});
