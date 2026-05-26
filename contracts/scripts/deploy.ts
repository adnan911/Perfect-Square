import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractFactory("PerfectSquareNFT");
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  console.log(`PerfectSquareNFT deployed to: ${await contract.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
