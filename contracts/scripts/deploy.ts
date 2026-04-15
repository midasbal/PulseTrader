import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=".repeat(60));
  console.log("🚀 PulseTrader+ — Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network:  X Layer Testnet (Chain ID: 1952)`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} OKB`);
  console.log("=".repeat(60));

  // --- Deploy MockUSDC (PUSDC) ---
  console.log("\n📦 Deploying MockUSDC (PUSDC)...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const pusdc = await MockUSDC.deploy();
  await pusdc.waitForDeployment();
  const pusdcAddress = await pusdc.getAddress();
  console.log(`✅ MockUSDC deployed at: ${pusdcAddress}`);

  // --- Deploy MockWETH (PWETH) ---
  console.log("\n📦 Deploying MockWETH (PWETH)...");
  const MockWETH = await ethers.getContractFactory("MockWETH");
  const pweth = await MockWETH.deploy();
  await pweth.waitForDeployment();
  const pwethAddress = await pweth.getAddress();
  console.log(`✅ MockWETH deployed at: ${pwethAddress}`);

  // --- Verify initial supplies ---
  const pusdcSupply = await pusdc.totalSupply();
  const pwethSupply = await pweth.totalSupply();
  console.log(
    `\n📊 PUSDC total supply: ${ethers.formatUnits(pusdcSupply, 6)} PUSDC`
  );
  console.log(
    `📊 PWETH total supply: ${ethers.formatUnits(pwethSupply, 18)} PWETH`
  );

  // --- Mint extra tokens to the Agentic Wallet if configured ---
  const agentAddress = process.env.AGENT_WALLET_ADDRESS;
  if (agentAddress) {
    console.log(`\n🤖 Minting tokens to Agentic Wallet: ${agentAddress}`);

    const mintPUSDC = await pusdc.mint(
      agentAddress,
      ethers.parseUnits("100000", 6)
    );
    await mintPUSDC.wait();
    console.log("   ✅ Minted 100,000 PUSDC to Agentic Wallet");

    const mintPWETH = await pweth.mint(
      agentAddress,
      ethers.parseUnits("50", 18)
    );
    await mintPWETH.wait();
    console.log("   ✅ Minted 50 PWETH to Agentic Wallet");
  } else {
    console.log(
      "\n⚠️  AGENT_WALLET_ADDRESS not set in .env — skipping agent mint."
    );
    console.log(
      "   Set it later and run: npx hardhat run scripts/mint-to-agent.ts --network xlayer"
    );
  }

  // --- Print summary ---
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`MockUSDC (PUSDC): ${pusdcAddress}`);
  console.log(`MockWETH (PWETH): ${pwethAddress}`);
  console.log(`Gas used:         ${ethers.formatEther(gasUsed)} OKB`);
  console.log(`Remaining:        ${ethers.formatEther(finalBalance)} OKB`);
  console.log("=".repeat(60));
  console.log("\n💾 Save these addresses in your backend .env file!");
  console.log(`PUSDC_ADDRESS=${pusdcAddress}`);
  console.log(`PWETH_ADDRESS=${pwethAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
