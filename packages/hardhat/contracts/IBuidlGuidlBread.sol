//SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IBuidlGuidlBread {
    event BatchMint(address indexed user, uint256 amount);
    event OwnerMint(address indexed to, uint256 amount);
    event BatchMintLimitUpdated(uint256 newLimit);
    event MintingPaused(uint256 endTime);
    event BatchMintingPeriodCompleted(uint256 timestamp);

    error CannotSetZeroAddress();
    error BatchMintLimitCannotBeZero();
    error UnauthorizedBatchMinter();
    error UnauthorizedPause();
    error BatchMintCooldownNotExpired();
    error BatchMintAmountExceedsLimit();
    error BatchMintingPeriodCompletionPaused();
    error NoBatchMintingOccurredThisPeriod();
    error ArrayLengthMismatch();
    error EmptyArrays();
    error BatchSizeTooLarge();
    error CannotMintWhilePaused();
    error CannotMintZeroAmount();
    error CannotMintToZeroAddress();
    error OwnerMintCooldownNotExpired();
    error OwnerMintAmountExceedsLimit();
} 