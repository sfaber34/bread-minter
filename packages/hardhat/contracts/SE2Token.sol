//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SE2Token is ERC20 {

    address public rpcAddress;

    constructor(address rpcAddress_) ERC20("SE2Token", "SE2") {
        rpcAddress = rpcAddress_;
    }

    modifier onlyRpc() {
        require(msg.sender == rpcAddress, "Only RPC can call this function");
        _;
    }

    // Minting is open to anyone and for free.
    // You can implement your custom logic to mint tokens.
    function mint(address to, uint256 amount) public onlyRpc {
        _mint(to, amount);
    }
}
