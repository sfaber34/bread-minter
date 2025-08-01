//SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBuidlGuidlBread} from "./IBuidlGuidlBread.sol";

contract BuidlGuidlBread is ERC20, Ownable, IBuidlGuidlBread {
    uint256 public constant BATCH_MINT_COOLDOWN = 23 hours;
    uint256 public constant OWNER_MINT_COOLDOWN = 24 hours;
    uint256 public constant OWNER_MINT_LIMIT = 10_000 ether;
    address public batchMinterAddress;
    address public pauseAddress;
    uint256 public batchMintLimit = 420 ether;
    uint256 public lastBatchMintTime;
    uint256 public totalBatchMintedInPeriod;    
    uint256 public lastOwnerMintTime;
    uint256 public totalOwnerMintedInPeriod;
    uint256 public pauseEndTime = 0;
    bool public batchMintingOccurredThisPeriod;

    /// @param initialOwner The address that will own the contract and receive initial tokens
    /// @param batchMinterAddress_ The address authorized to perform batch mint/burn operations
    /// @param pauseAddress_ The address authorized to pause minting
    constructor(
        address initialOwner,
        address batchMinterAddress_,
        address pauseAddress_
    ) ERC20("BuidlGuidl Bread", "BGBRD") Ownable(initialOwner) {
        if (batchMinterAddress_ == address(0)) revert CannotSetZeroAddress();
        if (pauseAddress_ == address(0)) revert CannotSetZeroAddress();
        batchMinterAddress = batchMinterAddress_;
        pauseAddress = pauseAddress_;
    }

    /// @notice Updates the Batch Minter address
    /// @param newAddress The new address that will be authorized to perform batch operations
    /// @dev Only the contract owner can call this function
    function setBatchMinterAddress(address newAddress) public onlyOwner {
        if (newAddress == address(0)) revert CannotSetZeroAddress();
        batchMinterAddress = newAddress;
    }

    /// @notice Updates the address that has pausing privileges
    /// @param newAddress The new address that will be authorized to perform pauses
    /// @dev Only the contract owner can call this function
    function setPauseAddress(address newAddress) public onlyOwner {
        if (newAddress == address(0)) revert CannotSetZeroAddress();
        pauseAddress = newAddress;
    }

    /// @notice Sets the maximum amount that can be minted per cooldown period globally
    /// @param newLimit The new mint limit in wei (with 18 decimals)
    /// @dev Only the contract owner can call this function. Limit must be greater than 0
    function setBatchMintLimit(uint256 newLimit) public onlyOwner {
        if (newLimit == 0) revert BatchMintLimitCannotBeZero();
        batchMintLimit = newLimit;
        emit BatchMintLimitUpdated(newLimit);
    }

    modifier onlyBatchMinter() {
        if (msg.sender != batchMinterAddress) revert UnauthorizedBatchMinter();
        _;
    }

    modifier onlyPause() {
        if (msg.sender != pauseAddress) revert UnauthorizedPause();
        _;
    }

    /// @notice Pauses the minting functionality for 24 hours
    /// @dev Only the pause address can call this function
    function pauseMinting() public onlyPause {
        pauseEndTime = block.timestamp + 24 hours;
        emit MintingPaused(pauseEndTime);
    }

    /// @notice Returns the remaining cooldown time before batch minting can resume globally
    /// @return The number of seconds remaining in the cooldown period (0 if cooldown has passed)
    function getRemainingBatchMintCooldown() public view returns (uint256) {
        uint256 timeSinceLastReset = block.timestamp - lastBatchMintTime;

        if (timeSinceLastReset >= BATCH_MINT_COOLDOWN) {
            return 0;
        }

        return BATCH_MINT_COOLDOWN - timeSinceLastReset;
    }

    /// @notice Returns the amount of tokens batch minted in the current period
    /// @return The amount of tokens batch minted in the current period
    function getTotalBatchMintedInPeriod() public view returns (uint256) {
        return totalBatchMintedInPeriod;
    }

    /// @notice Returns the remaining amount that can be batch minted in the current period
    /// @return The amount of tokens that can still be batch minted in the current period
    function getRemainingBatchMintAmount() public view returns (uint256) {
        if (totalBatchMintedInPeriod >= batchMintLimit) {
            return 0;
        }

        return batchMintLimit - totalBatchMintedInPeriod;
    }

    /// @notice Completes the current batch minting period and resets for the next period
    /// @dev Only the RPC Bread Minter can call this function after minting has occurred
    /// @dev Blocked when minting is paused to prevent period reset during emergency
    function completeBatchMintingPeriod() public onlyBatchMinter {
        if (block.timestamp < pauseEndTime) revert BatchMintingPeriodCompletionPaused();
        if (!batchMintingOccurredThisPeriod) revert NoBatchMintingOccurredThisPeriod();
        
        // Reset the period
        totalBatchMintedInPeriod = 0;
        lastBatchMintTime = block.timestamp;
        batchMintingOccurredThisPeriod = false;
        
        emit BatchMintingPeriodCompleted(block.timestamp);
    }

    /// @notice Mints tokens to multiple addresses in a single transaction
    /// @param addresses Array of recipient addresses
    /// @param amounts Array of amounts to mint (must match addresses array length)
    /// @dev Only the authorized Batch Minter can call this function
    /// @dev Enforces overall rate limiting and validates all inputs
    /// @dev Maximum batch size is 100 to prevent gas issues
    function batchMint(address[] calldata addresses, uint256[] calldata amounts) public onlyBatchMinter {
        if (addresses.length != amounts.length) revert ArrayLengthMismatch();
        if (addresses.length == 0) revert EmptyArrays();
        if (addresses.length > 100) revert BatchSizeTooLarge(); // Prevent gas issues with large arrays
        if (block.timestamp < pauseEndTime) revert CannotMintWhilePaused();

        // Calculate total amount to check against global limit
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert CannotMintZeroAmount();
            totalAmount += amounts[i];
        }

        // Check global rate limit for the total amount
        _checkBatchMintRateLimit(totalAmount);

        // Perform the mints
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i] == address(0)) revert CannotMintToZeroAddress();
            _mint(addresses[i], amounts[i]);
            emit BatchMint(addresses[i], amounts[i]);
        }

        // Update global tracking
        totalBatchMintedInPeriod += totalAmount;
        batchMintingOccurredThisPeriod = true;
    }

    /// @notice Returns the remaining cooldown time before owner minting can resume
    /// @return The number of seconds remaining in the owner mint cooldown period (0 if cooldown has passed)
    function getOwnerMintRemainingCooldown() public view returns (uint256) {
        uint256 timeSinceLastMint = block.timestamp - lastOwnerMintTime;

        if (timeSinceLastMint >= OWNER_MINT_COOLDOWN) {
            return 0;
        }

        return OWNER_MINT_COOLDOWN - timeSinceLastMint;
    }

    /// @notice Returns the amount of tokens owner minted in the current period
    /// @return The amount of tokens owner minted in the current period
    function getTotalOwnerMintedInPeriod() public view returns (uint256) {
        return totalOwnerMintedInPeriod;
    }

    /// @notice Returns the remaining amount that can be owner minted in the current period
    /// @return The amount of tokens that can still be owner minted in the current period
    function getRemainingOwnerMintAmount() public view returns (uint256) {
        if (totalOwnerMintedInPeriod >= OWNER_MINT_LIMIT) {
            return 0;
        }

        return OWNER_MINT_LIMIT - totalOwnerMintedInPeriod;
    }

    /// @notice Mints tokens to a single address (can be called by owner only)
    /// @param to The address to mint tokens to
    /// @param amount The amount of tokens to mint
    /// @dev Only the contract owner can call this function
    /// @dev Enforces 24-hour cooldown and owner mint limit
    /// @dev Respects global pause functionality
    function ownerMint(address to, uint256 amount) public onlyOwner {
        if (block.timestamp < pauseEndTime) revert CannotMintWhilePaused();
        if (amount == 0) revert CannotMintZeroAmount();
        if (to == address(0)) revert CannotMintToZeroAddress();
        
        // If cooldown period has passed, reset the period
        if (block.timestamp >= lastOwnerMintTime + OWNER_MINT_COOLDOWN) {
            totalOwnerMintedInPeriod = 0;
        } else {
            // Still in cooldown period, check if we would exceed limit
            if (totalOwnerMintedInPeriod + amount > OWNER_MINT_LIMIT) {
                revert OwnerMintAmountExceedsLimit();
            }
        }
        
        // Check if amount would exceed limit for this period
        if (amount > OWNER_MINT_LIMIT) revert OwnerMintAmountExceedsLimit();
        
        _mint(to, amount);
        
        // Update tracking
        totalOwnerMintedInPeriod += amount;
        lastOwnerMintTime = block.timestamp;
        
        emit OwnerMint(to, amount);
    }

    /// @dev Internal function to check and enforce batch mint rate limiting for token minting
    /// @param amount The amount of tokens being minted
    /// @notice Checks if cooldown has passed and validates amount against current period limit
    function _checkBatchMintRateLimit(uint256 amount) internal view {
        // Check if cooldown period has passed since last reset
        if (block.timestamp < lastBatchMintTime + BATCH_MINT_COOLDOWN) revert BatchMintCooldownNotExpired();
        
        // Check if the amount would exceed the global limit for this period
        if (totalBatchMintedInPeriod + amount > batchMintLimit) revert BatchMintAmountExceedsLimit();
    }
}
