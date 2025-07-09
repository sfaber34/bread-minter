# Bread Contract Test Suite

This directory contains comprehensive tests for the Bread ERC20 token contract, leveraging Scaffold-ETH 2's built-in testing functionality.

## 📋 Test Coverage

The test suite includes **52 comprehensive tests** covering:

### 1. **Deployment Tests**
- Contract initialization with correct parameters
- Initial token supply and distribution
- Proper setup of roles and permissions

### 2. **Owner Functions**
- `setRpcBreadMinterAddress()` - Update authorized minter
- `setMintLimit()` - Modify per-period mint limits
- `setMintCooldown()` - Adjust cooldown periods
- Access control enforcement

### 3. **Rate Limiting System**
- `getRemainingCooldown()` - Time until next mint allowed
- `getMintedInPeriod()` - Tokens minted in current period
- `getRemainingMintAmount()` - Available mint capacity
- Cooldown period logic and resets

### 4. **Batch Minting**
- Multi-address token minting
- Rate limit enforcement per recipient
- Input validation (array lengths, zero addresses, zero amounts)
- Maximum batch size limits (100 addresses)
- Access control (only RPC Bread Minter)

### 5. **Batch Burning**
- Multi-address token burning for penalties
- Input validation and error handling
- Insufficient balance handling
- Access control enforcement

### 6. **Access Control**
- `onlyOwner` modifier enforcement
- `onlyRpcBreadMinter` modifier enforcement
- Unauthorized access rejection

### 7. **Edge Cases & Complex Scenarios**
- Multiple mints within cooldown periods
- Dynamic parameter changes (limits, cooldowns)
- Large number handling
- Independent user rate limiting
- Time-based state transitions

### 8. **Events & Gas Optimization**
- Proper event emission
- Gas efficiency testing for batch operations
- Debug event verification

## 🚀 Running the Tests

### Prerequisites
Make sure you're in the hardhat package directory:
```bash
cd packages/hardhat
```

### Run All Tests
```bash
yarn test
```

### Run Tests with Gas Reporting
```bash
REPORT_GAS=true yarn test
```

### Run Specific Test Categories
```bash
# Run only deployment tests
npx hardhat test --grep "Deployment"

# Run only batch minting tests
npx hardhat test --grep "Batch Minting"

# Run only access control tests
npx hardhat test --grep "Access Control"
```

### Run Tests with Coverage
```bash
npx hardhat coverage
```

## 🛠 Testing Framework

The tests use **Scaffold-ETH 2's** modern testing stack:

- **Hardhat** - Development environment
- **Ethers.js v6** - Ethereum library
- **Chai** - Assertion library
- **@nomicfoundation/hardhat-chai-matchers** - Blockchain-specific matchers
- **@nomicfoundation/hardhat-network-helpers** - Time manipulation and testing utilities

### Key Testing Utilities Used

```typescript
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { parseEther, formatEther } from "ethers";
```

### Fixture Pattern
Tests use the `loadFixture` pattern for efficient setup:

```typescript
async function deployBreadFixture() {
  const [owner, rpcBreadMinter, user1, user2, user3, unauthorized] = await ethers.getSigners();
  const BreadFactory = await ethers.getContractFactory("Bread");
  const bread = await BreadFactory.deploy(rpcBreadMinter.address);
  return { bread, owner, rpcBreadMinter, user1, user2, user3, unauthorized };
}
```

### Time Manipulation
Rate limiting tests use time helpers:

```typescript
// Fast forward past cooldown period
await time.increase(601); // 601 seconds
```

## 📊 Test Results Example

When you run the tests, you'll see output like:

```
  Bread Contract
    Deployment
      ✔ Should set the correct initial values
      ✔ Should mint 100,000 tokens to the deployer
      ✔ Should set the RPC Bread Minter address correctly
    Owner Functions
      setRpcBreadMinterAddress
        ✔ Should allow owner to update RPC Bread Minter address
        ✔ Should reject non-owner attempts to update RPC Bread Minter address
    ...

  52 passing (1s)
```

## 🧪 Manual Testing Script

For manual testing and demonstration, use the interaction script:

```bash
npx hardhat run scripts/interact-bread.ts --network localhost
```

This script demonstrates:
- Contract deployment
- Batch minting operations
- Rate limiting in action
- Batch burning operations  
- Access control enforcement
- Owner function usage

## 🎯 Testing Best Practices Used

1. **Comprehensive Coverage** - Every function and edge case tested
2. **Fixture Pattern** - Efficient test setup and isolation
3. **Descriptive Test Names** - Clear intent and expected behavior
4. **Event Verification** - Ensuring proper event emission
5. **Error Testing** - Validating error conditions and messages
6. **Gas Optimization** - Performance testing for batch operations
7. **Time-based Testing** - Proper cooldown and rate limiting verification
8. **Access Control** - Security boundary testing

## 📈 Gas Usage Analysis

The test suite includes gas reporting that shows:
- Deployment costs
- Function call costs (min/max/average)
- Batch operation efficiency
- Gas optimization verification

## 🔍 Debugging

For debugging failed tests:

1. **Check specific test output** - Look at the detailed error messages
2. **Use console.log** - Add logging to understand state changes
3. **Check events** - Verify expected events are emitted
4. **Time-related issues** - Ensure proper time advancement in tests

## 📝 Adding New Tests

When adding new functionality to the contract:

1. **Add tests to appropriate describe block**
2. **Use the fixture pattern for setup**
3. **Test both success and failure cases**
4. **Verify events and state changes**
5. **Include edge cases and boundary conditions**

Example test structure:
```typescript
describe("New Feature", function () {
  it("Should handle normal case", async function () {
    const { bread, user1 } = await loadFixture(deployBreadFixture);
    // Test implementation
    expect(result).to.equal(expected);
  });

  it("Should reject invalid input", async function () {
    const { bread, user1 } = await loadFixture(deployBreadFixture);
    await expect(bread.newFunction(invalidInput))
      .to.be.revertedWith("Expected error message");
  });
});
```

This test suite ensures the Bread contract is thoroughly tested and ready for production use! 