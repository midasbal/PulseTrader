import { ethers } from "hardhat";

/**
 * Utility script to mint additional mock tokens to the Agentic Wallet.
 * Usage: npx hardhat run scripts/mint-to-agent.ts --network xlayer
 *
 * Required env vars:
 *   AGENT_WALLET_ADDRESS - The agentic wallet address to mint to
 *   PUSDC_ADDRESS        - Deployed MockUSDC contract address
 *   PWETH_ADDRESS        - Deployed MockWETH contract address
 */
async function main() {
  const agentAddress = process.env.AGENT_WALLET_ADDRESS;
  const pusdcAddress = process.env.PUSDC_ADDRESS;
  const pwethAddress = process.env.PWETH_ADDRESS;

  if (!agentAddress || !pusdcAddress || !pwethAddress) {
    console.error(
      "❌ Missing env vars. Set AGENT_WALLET_ADDRESS, PUSDC_ADDRESS, PWETH_ADDRESS"
    );
    process.exit(1);
  }

  console.log(`🤖 Minting tokens to Agentic Wallet: ${agentAddress}`);

  const pusdc = await ethers.getContractAt("MockUSDC", pusdcAddress);
  const pweth = await ethers.getContractAt("MockWETH", pwethAddress);

  // Mint 500,000 PUSDC
  const tx1 = await pusdc.mint(
    agentAddress,
    ethers.parseUnits("500000", 6)
  );
  await tx1.wait();
  console.log("✅ Minted 500,000 PUSDC");

  // Mint 100 PWETH
  const tx2 = await pweth.mint(
    agentAddress,
    ethers.parseUnits("100", 18)
  );
  await tx2.wait();
  console.log("✅ Minted 100 PWETH");

  // Check balances
  const pusdcBal = await pusdc.balanceOf(agentAddress);
  const pwethBal = await pweth.balanceOf(agentAddress);
  console.log(
    `\n📊 Agent PUSDC balance: ${ethers.formatUnits(pusdcBal, 6)}`
  );
  console.log(`📊 Agent PWETH balance: ${ethers.formatUnits(pwethBal, 18)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
