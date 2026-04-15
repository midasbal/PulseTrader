// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC (PulseUSDC / PUSDC)
 * @notice A mock USDC token for the PulseTrader+ hackathon demo on X Layer Testnet.
 *         Anyone can mint tokens via the public `mint()` function, allowing unlimited
 *         swap liquidity without needing real tokens.
 * @dev Uses 6 decimals to match real USDC behavior.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("PulseUSDC", "PUSDC") Ownable(msg.sender) {
        // Mint 1,000,000 PUSDC to deployer for initial pool seeding
        _mint(msg.sender, 1_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Public mint function — anyone can mint PUSDC for testing.
     * @param to   The address to receive the minted tokens.
     * @param amount The amount of tokens to mint (in smallest unit, 6 decimals).
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
