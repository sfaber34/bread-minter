//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Bread is ERC20 {
    event Mint(address indexed user, uint256 amount);

    address public rpcAddress;

    constructor(address rpcAddress_) ERC20("Bread", "BRD") {
        rpcAddress = rpcAddress_;
    }

    modifier onlyRpc() {
        require(msg.sender == rpcAddress, "Only RPC can call this function");
        _;
    }

    function mint(address to, uint256 amount) public onlyRpc {
        _mint(to, amount);
    }

    function batchMint(address[] calldata addresses, uint256[] calldata amounts) public onlyRpc {
        require(addresses.length == amounts.length, "Address and amount arrays must be the same length");
        require(addresses.length > 0, "Arrays cannot be empty");
        require(addresses.length <= 100, "Maximum batch size is 100"); // Prevent gas issues with large arrays

        for (uint256 i = 0; i < addresses.length; i++) {
            require(addresses[i] != address(0), "Cannot mint to zero address");
            require(amounts[i] > 0, "Amount must be greater than 0");
            _mint(addresses[i], amounts[i]);
            emit Mint(addresses[i], amounts[i]);
        }
    }
}
