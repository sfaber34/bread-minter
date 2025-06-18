//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Bread is ERC20, Ownable {
    event Mint(address indexed user, uint256 amount);
    event PenaltyBurn(address indexed target, uint256 amount);
    event MintLimitUpdated(uint256 newLimit);
    event CooldownUpdated(uint256 newCooldown);
    event DebugTime(address indexed user, uint256 currentTime, uint256 lastMintTime, uint256 cooldown);
    event DebugCooldown(address indexed user, uint256 currentTime, uint256 lastMintTime, uint256 timeSinceLastMint, uint256 remainingCooldown);

    address public rpcBreadMinterAddress;
    uint256 public mintLimit = 100 * 10**18; // 100 Bread with 18 decimals
    uint256 public mintCooldown = 10 minutes;

    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public mintedInPeriod;

    constructor(address rpcBreadMinterAddress_) ERC20("Bread", "BRD") Ownable(msg.sender) {
        rpcBreadMinterAddress = rpcBreadMinterAddress_;
        _mint(msg.sender, 100000 * 10 ** 18);
    }

    function setRpcBreadMinterAddress(address newAddress) public onlyOwner {
        rpcBreadMinterAddress = newAddress;
    }

    function setMintLimit(uint256 newLimit) public onlyOwner {
        require(newLimit > 0, "Mint limit must be greater than 0");
        mintLimit = newLimit;
        emit MintLimitUpdated(newLimit);
    }

    function setMintCooldown(uint256 newCooldown) public onlyOwner {
        require(newCooldown > 0, "Cooldown must be greater than 0");
        mintCooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    modifier onlyRpcBreadMinter() {
        require(msg.sender == rpcBreadMinterAddress, "Only RPC Bread Minter can call this function");
        _;
    }

    function _checkRateLimit(address to, uint256 amount) internal {
        uint256 currentTime = block.timestamp;
        
        // If it's been more than cooldown period since last mint, reset the period
        if (currentTime >= lastMintTime[to] + mintCooldown) {
            mintedInPeriod[to] = 0;
        }
        
        // Check if the new amount would exceed the limit
        require(mintedInPeriod[to] + amount <= mintLimit, "Mint amount exceeds limit");
        
        // Update the tracking
        lastMintTime[to] = currentTime;
        mintedInPeriod[to] += amount;
        
        emit DebugTime(to, currentTime, lastMintTime[to], mintCooldown);
    }

    function getRemainingCooldown(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastMint = currentTime - lastMintTime[user];
        
        if (timeSinceLastMint >= mintCooldown) {
            return 0;
        }
        
        return mintCooldown - timeSinceLastMint;
    }

    function debugCooldown(address user) public returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastMint = currentTime - lastMintTime[user];
        uint256 remaining;
        
        if (timeSinceLastMint >= mintCooldown) {
            remaining = 0;
        } else {
            remaining = mintCooldown - timeSinceLastMint;
        }
        
        emit DebugCooldown(user, currentTime, lastMintTime[user], timeSinceLastMint, remaining);
        return remaining;
    }

    function getMintedInPeriod(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        if (currentTime >= lastMintTime[user] + mintCooldown) {
            return 0;
        }
        return mintedInPeriod[user];
    }

    function getRemainingMintAmount(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        if (currentTime >= lastMintTime[user] + mintCooldown) {
            return mintLimit;
        }
        return mintLimit - mintedInPeriod[user];
    }

    function mint(address to, uint256 amount) public onlyRpcBreadMinter {
        _checkRateLimit(to, amount);
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
            _checkRateLimit(addresses[i], amounts[i]);
            _mint(addresses[i], amounts[i]);
            emit Mint(addresses[i], amounts[i]);
        }
    }

    function batchBurn(address[] calldata addresses, uint256[] calldata amounts) public onlyRpcBreadMinter {
        require(addresses.length == amounts.length, "Address and amount arrays must be the same length");
        require(addresses.length > 0, "Arrays cannot be empty");
        require(addresses.length <= 100, "Maximum batch size is 100"); // Prevent gas issues with large arrays

        for (uint256 i = 0; i < addresses.length; i++) {
            require(addresses[i] != address(0), "Cannot burn from zero address");
            require(amounts[i] > 0, "Amount must be greater than 0");
            _burn(addresses[i], amounts[i]);
            emit PenaltyBurn(addresses[i], amounts[i]);
        }
    }
}
