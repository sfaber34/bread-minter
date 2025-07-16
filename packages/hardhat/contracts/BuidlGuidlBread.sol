//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BuidlGuidlBread is ERC20, Ownable {
    event Mint(address indexed user, uint256 amount);
    event PenaltyBurn(address indexed target, uint256 amount);
    event MintLimitUpdated(uint256 newLimit);
    event CooldownUpdated(uint256 newCooldown);
    event MintingPaused(uint256 endTime);
    event MintingPeriodCompleted(uint256 timestamp);

    address public rpcBreadMinterAddress;
    address public pauseAddress;
    uint256 public mintLimit = 420 * 10 ** 18; // 420 Bread with 18 decimals
    uint256 public mintCooldown = 23 hours; // Changed to 23 hours for 1-hour buffer
    uint256 public pauseEndTime = 0;

    // Global rate limiting instead of per-address
    uint256 public lastGlobalMintTime;
    uint256 public globalMintedInPeriod;
    bool public mintingOccurredThisPeriod;

    /// @param initialOwner The address that will own the contract and receive initial tokens
    /// @param rpcBreadMinterAddress_ The address authorized to perform batch mint/burn operations
    /// @param pauseAddress_ The address authorized to pause minting
    /// @dev Mints 1,000,000 tokens to the initial owner and sets up the contract
    constructor(
        address initialOwner,
        address rpcBreadMinterAddress_,
        address pauseAddress_
    ) ERC20("BuidlGuidl Bread", "BGBRD") Ownable(initialOwner) {
        rpcBreadMinterAddress = rpcBreadMinterAddress_;
        pauseAddress = pauseAddress_;
        _mint(initialOwner, 1000000 * 10 ** 18);
    }

    /// @notice Updates the RPC Bread Minter address
    /// @param newAddress The new address that will be authorized to perform batch operations
    /// @dev Only the contract owner can call this function
    function setRpcBreadMinterAddress(address newAddress) public onlyOwner {
        rpcBreadMinterAddress = newAddress;
    }

    /// @notice Updates the RPC address with pausing privileges
    /// @param newAddress The new address that will be authorized to perform pauses
    /// @dev Only the contract owner can call this function
    function setPauseAddress(address newAddress) public onlyOwner {
        pauseAddress = newAddress;
    }

    /// @notice Sets the maximum amount that can be minted per cooldown period globally
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

    modifier onlyPause() {
        require(msg.sender == pauseAddress, "Only pause address can call this function");
        _;
    }

    /// @dev Internal function to check and enforce global rate limiting for token minting
    /// @param amount The amount of tokens being minted
    /// @notice Checks if cooldown has passed and validates amount against current period limit
    function _checkGlobalRateLimit(uint256 amount) internal view {
        // Check if cooldown period has passed since last reset
        require(block.timestamp >= lastGlobalMintTime + mintCooldown, "Cooldown period not expired");
        
        // Check if the amount would exceed the global limit for this period
        require(globalMintedInPeriod + amount <= mintLimit, "Mint amount exceeds global limit");
    }

    /// @notice Returns the remaining cooldown time before minting can resume globally
    /// @return The number of seconds remaining in the cooldown period (0 if cooldown has passed)
    function getRemainingCooldown() public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 timeSinceLastReset = currentTime - lastGlobalMintTime;

        if (timeSinceLastReset >= mintCooldown) {
            return 0;
        }

        return mintCooldown - timeSinceLastReset;
    }

    /// @notice Returns the amount of tokens minted globally in the current period
    /// @return The amount of tokens minted in the current period
    function getGlobalMintedInPeriod() public view returns (uint256) {
        return globalMintedInPeriod;
    }

    /// @notice Returns the remaining amount that can be minted globally in the current period
    /// @return The amount of tokens that can still be minted in the current period
    function getRemainingMintAmount() public view returns (uint256) {
        if (globalMintedInPeriod >= mintLimit) {
            return 0;
        }

        return mintLimit - globalMintedInPeriod;
    }

    /// @notice Pauses the minting functionality for 24 hours
    /// @dev Only the pause address can call this function
    function pauseMinting() public onlyPause {
        pauseEndTime = block.timestamp + 24 hours;
        emit MintingPaused(pauseEndTime);
    }

    /// @notice Completes the current minting period and resets for the next period
    /// @dev Only the RPC Bread Minter can call this function after minting has occurred
    /// @dev Must be called within 2 hours of the cooldown expiring to prevent abuse (except for first completion)
    /// @dev Blocked when minting is paused to prevent period reset during emergency
    function completeMintingPeriod() public onlyRpcBreadMinter {
        require(block.timestamp >= pauseEndTime, "Period completion paused");
        require(mintingOccurredThisPeriod, "No minting occurred this period");
        
        // Only enforce reset window after the first period completion
        if (lastGlobalMintTime > 0) {
            require(block.timestamp <= lastGlobalMintTime + mintCooldown + 2 hours, "Reset window expired");
        }
        
        // Reset the period
        globalMintedInPeriod = 0;
        lastGlobalMintTime = block.timestamp;
        mintingOccurredThisPeriod = false;
        
        emit MintingPeriodCompleted(block.timestamp);
    }

    /// @notice Mints tokens to multiple addresses in a single transaction
    /// @param addresses Array of recipient addresses
    /// @param amounts Array of amounts to mint (must match addresses array length)
    /// @dev Only the authorized RPC Bread Minter can call this function
    /// @dev Enforces global rate limiting and validates all inputs
    /// @dev Maximum batch size is 100 to prevent gas issues
    function batchMint(address[] calldata addresses, uint256[] calldata amounts) public onlyRpcBreadMinter {
        require(addresses.length == amounts.length, "Address and amount arrays must be the same length");
        require(addresses.length > 0, "Arrays cannot be empty");
        require(addresses.length <= 100, "Maximum batch size is 100"); // Prevent gas issues with large arrays
        require(block.timestamp >= pauseEndTime, "Minting is currently paused");

        // Calculate total amount to check against global limit
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(amounts[i] > 0, "Amount must be greater than 0");
            totalAmount += amounts[i];
        }

        // Check global rate limit for the total amount
        _checkGlobalRateLimit(totalAmount);

        // Perform the mints
        for (uint256 i = 0; i < addresses.length; i++) {
            require(addresses[i] != address(0), "Cannot mint to zero address");
            _mint(addresses[i], amounts[i]);
            emit Mint(addresses[i], amounts[i]);
        }

        // Update global tracking
        globalMintedInPeriod += totalAmount;
        mintingOccurredThisPeriod = true;
    }
}
