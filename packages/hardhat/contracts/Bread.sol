//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Bread is ERC20 {
    event Mint(address indexed user, uint256 amount);

    address public rpcBreadMinterAddress;

    constructor(address rpcBreadMinterAddress_) ERC20("Bread", "BRD") {
        rpcBreadMinterAddress = rpcBreadMinterAddress_;
    }

    modifier onlyRpcBreadMinter() {
        require(msg.sender == rpcBreadMinterAddress, "Only RPC Bread Minter can call this function");
        _;
    }

    function mint(address to, uint256 amount) public onlyRpcBreadMinter {
        _mint(to, amount);
        emit Mint(to, amount);
    }

    function batchMint(address[] calldata addresses, uint256[] calldata amounts) public onlyRpcBreadMinter {
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
