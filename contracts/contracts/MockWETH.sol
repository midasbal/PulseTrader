// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWETH (PulseWETH / PWETH)
 * @notice A mock WETH token for the PulseTrader+ hackathon demo on X Layer Testnet.
 *         Anyone can mint tokens via the public `mint()` function, allowing unlimited
 *         swap liquidity without needing real tokens.
 * @dev Uses 18 decimals (standard ERC-20 default) to match real WETH behavior.
 */
contract MockWETH is ERC20, Ownable {
    constructor() ERC20("PulseWETH", "PWETH") Ownable(msg.sender) {
        // Mint 1,000 PWETH to deployer for initial pool seeding
        _mint(msg.sender, 1_000 * 10 ** 18);
    }

    /**
     * @notice Public mint function — anyone can mint PWETH for testing.
     * @param to   The address to receive the minted tokens.
     * @param amount The amount of tokens to mint (in smallest unit, 18 decimals).
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Convenience function to mint to the caller.
     * @param amount The amount of tokens to mint.
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
