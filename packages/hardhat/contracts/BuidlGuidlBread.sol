//SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract BuidlGuidlBread is ERC20, Ownable {
    event Mint(address indexed user, uint256 amount);
    event PenaltyBurn(address indexed target, uint256 amount);
    event MintLimitUpdated(uint256 newLimit);
    event MintingPaused(uint256 endTime);
    event MintingPeriodCompleted(uint256 timestamp);

    error ZeroAddress();
    error MintLimitCannotBeZero();
    error UnauthorizedRpcBreadMinter();
    error UnauthorizedPause();
    error CooldownNotExpired();
    error MintAmountExceedsGlobalLimit();
    error PeriodCompletionPaused();
    error NoMintingOccurredThisPeriod();
    error ArrayLengthMismatch();
    error EmptyArrays();
    error BatchSizeTooLarge();
    error MintingCurrentlyPaused();
    error InvalidAmount();
    error MintToZeroAddress();

    address public rpcBreadMinterAddress;
    address public pauseAddress;
    uint256 public mintLimit = 420 * 10 ** 18; // 420 Bread with 18 decimals
    uint256 public constant MINT_COOLDOWN = 23 hours;
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
        if (rpcBreadMinterAddress_ == address(0)) revert ZeroAddress();
        if (pauseAddress_ == address(0)) revert ZeroAddress();
        rpcBreadMinterAddress = rpcBreadMinterAddress_;
        pauseAddress = pauseAddress_;
        _mint(initialOwner, 1000000 * 10 ** 18);
    }

    /// @notice Updates the RPC Bread Minter address
    /// @param newAddress The new address that will be authorized to perform batch operations
    /// @dev Only the contract owner can call this function
    function setRpcBreadMinterAddress(address newAddress) public onlyOwner {
        if (newAddress == address(0)) revert ZeroAddress();
        rpcBreadMinterAddress = newAddress;
    }

    /// @notice Updates the RPC address with pausing privileges
    /// @param newAddress The new address that will be authorized to perform pauses
    /// @dev Only the contract owner can call this function
    function setPauseAddress(address newAddress) public onlyOwner {
        if (newAddress == address(0)) revert ZeroAddress();
        pauseAddress = newAddress;
    }

    /// @notice Sets the maximum amount that can be minted per cooldown period globally
    /// @param newLimit The new mint limit in wei (with 18 decimals)
    /// @dev Only the contract owner can call this function. Limit must be greater than 0
    function setMintLimit(uint256 newLimit) public onlyOwner {
        if (newLimit == 0) revert MintLimitCannotBeZero();
        mintLimit = newLimit;
        emit MintLimitUpdated(newLimit);
    }

    modifier onlyRpcBreadMinter() {
        if (msg.sender != rpcBreadMinterAddress) revert UnauthorizedRpcBreadMinter();
        _;
    }

    modifier onlyPause() {
        if (msg.sender != pauseAddress) revert UnauthorizedPause();
        _;
    }

    /// @dev Internal function to check and enforce global rate limiting for token minting
    /// @param amount The amount of tokens being minted
    /// @notice Checks if cooldown has passed and validates amount against current period limit
    function _checkGlobalRateLimit(uint256 amount) internal view {
        // Check if cooldown period has passed since last reset
        if (block.timestamp < lastGlobalMintTime + MINT_COOLDOWN) revert CooldownNotExpired();
        
        // Check if the amount would exceed the global limit for this period
        if (globalMintedInPeriod + amount > mintLimit) revert MintAmountExceedsGlobalLimit();
    }

    /// @notice Returns the remaining cooldown time before minting can resume globally
    /// @return The number of seconds remaining in the cooldown period (0 if cooldown has passed)
    function getRemainingCooldown() public view returns (uint256) {
        uint256 timeSinceLastReset = block.timestamp - lastGlobalMintTime;

        if (timeSinceLastReset >= MINT_COOLDOWN) {
            return 0;
        }

        return MINT_COOLDOWN - timeSinceLastReset;
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
    /// @dev Blocked when minting is paused to prevent period reset during emergency
    function completeMintingPeriod() public onlyRpcBreadMinter {
        if (block.timestamp < pauseEndTime) revert PeriodCompletionPaused();
        if (!mintingOccurredThisPeriod) revert NoMintingOccurredThisPeriod();
        
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
        if (addresses.length != amounts.length) revert ArrayLengthMismatch();
        if (addresses.length == 0) revert EmptyArrays();
        if (addresses.length > 100) revert BatchSizeTooLarge(); // Prevent gas issues with large arrays
        if (block.timestamp < pauseEndTime) revert MintingCurrentlyPaused();

        // Calculate total amount to check against global limit
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert InvalidAmount();
            totalAmount += amounts[i];
        }

        // Check global rate limit for the total amount
        _checkGlobalRateLimit(totalAmount);

        // Perform the mints
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == address(0)) revert MintToZeroAddress();
            _mint(addresses[i], amounts[i]);
            emit Mint(addresses[i], amounts[i]);
        }

        // Update global tracking
        globalMintedInPeriod += totalAmount;
        mintingOccurredThisPeriod = true;
    }
}
