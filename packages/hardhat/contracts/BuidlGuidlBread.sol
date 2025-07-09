//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BuidlGuidlBread is ERC20, Ownable {
    event Mint(address indexed user, uint256 amount);
    event PenaltyBurn(address indexed target, uint256 amount);
    event MintLimitUpdated(uint256 newLimit);
    event CooldownUpdated(uint256 newCooldown);

    address public rpcBreadMinterAddress;
    uint256 public mintLimit = 168 * 10**18; // 168 Bread with 18 decimals
    uint256 public mintCooldown = 24 hours;

    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public mintedInPeriod;

    /// @param rpcBreadMinterAddress_ The address authorized to perform batch mint/burn operations
    /// @dev Mints 100,000 tokens to the contract deployer and sets the initial minter address
    constructor(address rpcBreadMinterAddress_) ERC20("Buidl Guidl Bread", "BGBRD") Ownable(msg.sender) {
        rpcBreadMinterAddress = rpcBreadMinterAddress_;
        _mint(msg.sender, 100000 * 10 ** 18);
    }

    /// @notice Updates the RPC Bread Minter address
    /// @param newAddress The new address that will be authorized to perform batch operations
    /// @dev Only the contract owner can call this function
    function setRpcBreadMinterAddress(address newAddress) public onlyOwner {
        rpcBreadMinterAddress = newAddress;
    }

    /// @notice Sets the maximum amount that can be minted per cooldown period
    /// @param newLimit The new mint limit in wei (with 18 decimals)
    /// @dev Only the contract owner can call this function. Limit must be greater than 0
    function setMintLimit(uint256 newLimit) public onlyOwner {
        require(newLimit > 0, "Mint limit must be greater than 0");
        mintLimit = newLimit;
        emit MintLimitUpdated(newLimit);
    }

    /// @notice Sets the cooldown period between mint limit resets
    /// @param newCooldown The new cooldown period in seconds
    /// @dev Only the contract owner can call this function. Cooldown must be greater than 0
    function setMintCooldown(uint256 newCooldown) public onlyOwner {
        require(newCooldown > 0, "Cooldown must be greater than 0");
        mintCooldown = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    modifier onlyRpcBreadMinter() {
        require(msg.sender == rpcBreadMinterAddress, "Only RPC Bread Minter can call this function");
        _;
    }

    /// @dev Internal function to check and enforce rate limiting for token minting
    /// @param to The address receiving the tokens
    /// @param amount The amount of tokens being minted
    /// @notice Resets the minted amount if cooldown period has passed, otherwise checks limits
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
    }

    /// @notice Returns the remaining cooldown time for a user before they can mint again
    /// @param user The address to check cooldown for
    /// @return The number of seconds remaining in the cooldown period (0 if cooldown has passed)
    function getRemainingCooldown(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastMint = currentTime - lastMintTime[user];
        
        if (timeSinceLastMint >= mintCooldown) {
            return 0;
        }
        
        return mintCooldown - timeSinceLastMint;
    }

    /// @notice Returns the amount of tokens minted by a user in the current period
    /// @param user The address to check minted amount for
    /// @return The amount of tokens minted in the current cooldown period (0 if period has reset)
    function getMintedInPeriod(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        if (currentTime >= lastMintTime[user] + mintCooldown) {
            return 0;
        }
        return mintedInPeriod[user];
    }

    /// @notice Returns the remaining amount that can be minted by a user in the current period
    /// @param user The address to check remaining mint amount for
    /// @return The amount of tokens that can still be minted (full limit if period has reset)
    function getRemainingMintAmount(address user) public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        if (currentTime >= lastMintTime[user] + mintCooldown) {
            return mintLimit;
        }
        
        if (mintedInPeriod[user] >= mintLimit) {
            return 0;
        }
        
        return mintLimit - mintedInPeriod[user];
    }

    /// @notice Mints tokens to multiple addresses in a single transaction
    /// @param addresses Array of recipient addresses
    /// @param amounts Array of amounts to mint (must match addresses array length)
    /// @dev Only the authorized RPC Bread Minter can call this function
    /// @dev Enforces rate limiting for each recipient and validates all inputs
    /// @dev Maximum batch size is 100 to prevent gas issues
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

    /// @notice Burns tokens from multiple addresses in a single transaction
    /// @param addresses Array of addresses to burn tokens from
    /// @param amounts Array of amounts to burn (must match addresses array length)
    /// @dev Only the authorized RPC Bread Minter can call this function
    /// @dev Used for penalty burns or other administrative token removal
    /// @dev Maximum batch size is 100 to prevent gas issues
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