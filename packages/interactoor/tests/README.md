# Testing Guide

This directory contains comprehensive tests for Aztec contracts and interactions.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/counter.test.ts
```

## Test Structure

### counter.test.ts

Comprehensive test suite for the Counter contract covering:

- **Deployment Tests**: Verify contract initialization
- **Public Counter Tests**: Test public state modifications
- **Private Counter Tests**: Test private state and encryption
- **View Functions**: Test read-only operations
- **Simulation Tests**: Verify simulation vs execution behavior
- **Access Control**: Test admin-only functions

## Test Patterns

### Setup Pattern

```typescript
before(async () => {
  // Set up PXE
  // Create accounts
  // Deploy contract
});
```

### Testing Public Functions

```typescript
it('should modify public state', async () => {
  const before = await contract.methods.get_count().simulate();
  await contract.methods.increment().send().wait();
  const after = await contract.methods.get_count().simulate();
  assert.equal(after, before + 1n);
});
```

### Testing Private Functions

```typescript
it('should modify private state', async () => {
  const before = await contract.methods.get_private_count(user).simulate();
  await contract.methods.increment_private().send().wait();
  const after = await contract.methods.get_private_count(user).simulate();
  assert.equal(after, before + 1n);
});
```

### Testing Access Control

```typescript
it('should reject unauthorized calls', async () => {
  const contractAsNonAdmin = contract.withWallet(bob);
  await assert.rejects(
    async () => {
      await contractAsNonAdmin.methods.admin_function().send().wait();
    },
    /Only admin/
  );
});
```

### Testing Simulation

```typescript
it('should simulate without state changes', async () => {
  const before = await contract.methods.get_count().simulate();
  await contract.methods.increment().simulate(); // Only simulate
  const after = await contract.methods.get_count().simulate();
  assert.equal(before, after); // No change
});
```

## Best Practices

1. **Use before() for setup**: Set up PXE, accounts, and contracts once
2. **Test both positive and negative cases**: Success and failure scenarios
3. **Verify state changes**: Always check state before and after
4. **Test access control**: Ensure functions check permissions
5. **Use simulation**: Test transaction outcomes before sending
6. **Clean test data**: Use separate data directories for tests

## Common Issues

### Sandbox Not Running

```
Error: connect ECONNREFUSED 127.0.0.1:8080
```

**Solution**: Start the Aztec sandbox with `aztec start --sandbox`

### Contract Not Compiled

```
Error: Cannot find module '../src/artifacts/Counter.json'
```

**Solution**: Run `npm run build` to compile contracts

### Test Timeout

If tests time out, increase the timeout:

```typescript
it('long test', { timeout: 60000 }, async () => {
  // test code
});
```

## Writing New Tests

1. Create a new `.test.ts` file
2. Import test utilities and contract artifacts
3. Set up test environment in `before()`
4. Write test cases in `describe()` blocks
5. Use `it()` for individual test cases
6. Make assertions with `assert`

Example:

```typescript
import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

describe('My Contract', () => {
  before(async () => {
    // Setup
  });
  
  it('should do something', async () => {
    // Test
    assert.ok(true);
  });
});
```

## Resources

- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [Aztec Testing Guide](https://docs.aztec.network)
- [Assert Documentation](https://nodejs.org/api/assert.html)

