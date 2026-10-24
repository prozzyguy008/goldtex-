import test from 'node:test';
import assert from 'node:assert/strict';

const sellingPrice = (cost) => Math.round(cost * 1.1);

test('applies the 10 percent markup exactly once', () => {
  assert.equal(sellingPrice(144000), 158400);
  assert.equal(sellingPrice(69900), 76890);
  assert.equal(sellingPrice(23000), 25300);
});

test('does not invent a price for a missing cost', () => {
  const cost = null;
  assert.equal(cost === null ? null : sellingPrice(cost), null);
});
