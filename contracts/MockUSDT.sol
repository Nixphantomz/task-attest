// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Stand-in for USDT on X Layer testnet, where OKX has not deployed
/// an official test USDT token (confirmed via the X Layer contracts docs -
/// only a mainnet USDT address is listed). Anyone can mint themselves test
/// tokens to use in the demo. Deploy this FIRST, then use its address as
/// the `_usdt` constructor argument when deploying TaskAttest.
///
/// On mainnet, do NOT deploy this - use the real USDT address instead:
/// 0x1E4a5963aBFD975d8c9021ce480b42188849D41d
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {}

    /// @notice Anyone can mint themselves test tokens. Testnet only -
    /// obviously never do this on mainnet.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
