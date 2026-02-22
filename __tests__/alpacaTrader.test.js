'use strict';

// ---------------------------------------------------------------------------
// Mocks — hoisted before any require()
// ---------------------------------------------------------------------------

jest.mock('../Library/Order', () => ({
  SubmitOrder: jest.fn(),
}));

// AlpacaCreds.getCreds() is called at module-scope in alpacaTrader.js, so the
// mock must expose the resulting object so tests can configure it per-test.
jest.mock('../Library/Secrets/AlpacaCreds', () => {
  const mockAlpaca = {
    getAssets:       jest.fn(),
    getPositions:    jest.fn(),
    getAccount:      jest.fn(),
    cancelAllOrders: jest.fn(),
  };
  return { getCreds: () => mockAlpaca, __mockAlpaca: mockAlpaca };
}, { virtual: true });

// ---------------------------------------------------------------------------
// Module references (after mocks)
// ---------------------------------------------------------------------------

const Order         = require('../Library/Order');
const AlpacaCreds   = require('../Library/Secrets/AlpacaCreds');
const mockAlpaca    = AlpacaCreds.__mockAlpaca;
const { alpacaTrader } = require('../Library/alpacaTrader');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Flush Promise microtask queues.
 * Each await advances one level of the nested .then() chain.
 * alpacaTrader has 4 levels: getAssets → getPositions → getAccount → cancelAllOrders.
 * We flush 6 times to include any internal buffering by mockResolvedValue.
 */
async function flushAllPromises() {
  for (let i = 0; i < 6; i++) await Promise.resolve();
}

/** Minimal set of assets returned by getAssets(). */
function makeAsset(symbol, { tradable = true, easy_to_borrow = true, shortable = true } = {}) {
  return { symbol, tradable, easy_to_borrow, shortable };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LONG_POSITION  = { symbol: 'AAPL', weight:  0.5 };
const SHORT_POSITION = { symbol: 'TSLA', weight: -0.3 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('alpacaTrader', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Default happy-path setup — overridden per test as needed
    mockAlpaca.getAssets.mockResolvedValue([
      makeAsset('AAPL'),
      makeAsset('TSLA', { easy_to_borrow: true, shortable: true }),
    ]);
    mockAlpaca.getPositions.mockResolvedValue([]);
    mockAlpaca.getAccount.mockResolvedValue({ equity: '10000' });
    mockAlpaca.cancelAllOrders.mockResolvedValue({});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Alpaca API call sequence ────────────────────────────────────────────

  it('calls getAssets on the alpaca client', async () => {
    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    expect(mockAlpaca.getAssets).toHaveBeenCalledTimes(1);
  });

  it('calls getPositions after getAssets resolves', async () => {
    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    expect(mockAlpaca.getPositions).toHaveBeenCalledTimes(1);
  });

  it('calls getAccount after getPositions resolves', async () => {
    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    expect(mockAlpaca.getAccount).toHaveBeenCalledTimes(1);
  });

  it('calls cancelAllOrders after getAccount resolves', async () => {
    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    expect(mockAlpaca.cancelAllOrders).toHaveBeenCalledTimes(1);
  });

  // ── Order submission — portfolio exit ───────────────────────────────────

  it('submits a close-out order (weight=0) for each portfolio symbol not in the new target list', async () => {
    // Current portfolio: MSFT (not in new target), AAPL (in new target)
    mockAlpaca.getPositions.mockResolvedValue([
      { symbol: 'MSFT', qty: 10 },
      { symbol: 'AAPL', qty: 5 },
    ]);
    // Only AAPL is in getAssets+target list
    mockAlpaca.getAssets.mockResolvedValue([makeAsset('AAPL'), makeAsset('MSFT')]);

    alpacaTrader([LONG_POSITION]); // AAPL only
    await flushAllPromises();
    jest.runAllTimers();

    // MSFT should be closed: SubmitOrder(symbol, 0, existingQty, cb)
    const msfCalls = Order.SubmitOrder.mock.calls.filter(([sym, w]) => sym === 'MSFT' && w === 0);
    expect(msfCalls.length).toBeGreaterThanOrEqual(1);
    expect(msfCalls[0][2]).toBe(10); // pass existing qty
  });

  it('does NOT submit a close-out order for symbols that remain in the target list', async () => {
    mockAlpaca.getPositions.mockResolvedValue([{ symbol: 'AAPL', qty: 3 }]);
    mockAlpaca.getAssets.mockResolvedValue([makeAsset('AAPL')]);

    alpacaTrader([LONG_POSITION]); // AAPL in both old portfolio and new target
    await flushAllPromises();
    jest.runAllTimers();

    const closeOutCalls = Order.SubmitOrder.mock.calls.filter(([, w]) => w === 0);
    expect(closeOutCalls.length).toBe(0);
  });

  // ── Order submission — new target positions ──────────────────────────────

  it('submits SubmitOrder for each target position with weight * equity as amount', async () => {
    mockAlpaca.getAccount.mockResolvedValue({ equity: '20000' });
    mockAlpaca.getAssets.mockResolvedValue([makeAsset('AAPL')]);
    mockAlpaca.getPositions.mockResolvedValue([]);

    alpacaTrader([LONG_POSITION]); // weight 0.5 × equity 20000 = 10000
    await flushAllPromises();
    jest.runAllTimers();

    const aaplCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'AAPL');
    expect(aaplCalls.length).toBeGreaterThanOrEqual(1);
    // third argument to SubmitOrder is the dollar amount (weight * cash)
    expect(aaplCalls[0][1]).toBe(0.5 * 20000);
  });

  it('passes the existing share quantity from the portfolio to SubmitOrder', async () => {
    mockAlpaca.getAssets.mockResolvedValue([makeAsset('AAPL')]);
    mockAlpaca.getPositions.mockResolvedValue([{ symbol: 'AAPL', qty: 7 }]);

    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    const aaplCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'AAPL');
    expect(aaplCalls.length).toBeGreaterThanOrEqual(1);
    expect(aaplCalls[0][2]).toBe(7);
  });

  it('passes 0 for existing shares when symbol is not in current portfolio', async () => {
    mockAlpaca.getAssets.mockResolvedValue([makeAsset('AAPL')]);
    mockAlpaca.getPositions.mockResolvedValue([]); // no existing position

    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    const aaplCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'AAPL');
    expect(aaplCalls.length).toBeGreaterThanOrEqual(1);
    expect(aaplCalls[0][2]).toBe(0);
  });

  // ── Asset filtering ──────────────────────────────────────────────────────

  it('does not submit orders for non-tradable assets', async () => {
    mockAlpaca.getAssets.mockResolvedValue([
      makeAsset('AAPL', { tradable: false }), // not tradable
    ]);

    alpacaTrader([LONG_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    const aaplCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'AAPL');
    expect(aaplCalls.length).toBe(0);
  });

  it('excludes short positions for assets that are not easy_to_borrow and not shortable', async () => {
    mockAlpaca.getAssets.mockResolvedValue([
      makeAsset('TSLA', { tradable: true, easy_to_borrow: false, shortable: false }),
    ]);

    alpacaTrader([SHORT_POSITION]); // weight < 0 → short
    await flushAllPromises();
    jest.runAllTimers();

    const tslaCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'TSLA');
    expect(tslaCalls.length).toBe(0);
  });

  it('includes short positions for assets that are easy_to_borrow', async () => {
    mockAlpaca.getAssets.mockResolvedValue([
      makeAsset('TSLA', { tradable: true, easy_to_borrow: true, shortable: false }),
    ]);
    mockAlpaca.getAccount.mockResolvedValue({ equity: '10000' });

    alpacaTrader([SHORT_POSITION]); // weight -0.3
    await flushAllPromises();
    jest.runAllTimers();

    const tslaCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'TSLA');
    expect(tslaCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('includes short positions for assets that are shortable (even if not easy_to_borrow)', async () => {
    mockAlpaca.getAssets.mockResolvedValue([
      makeAsset('TSLA', { tradable: true, easy_to_borrow: false, shortable: true }),
    ]);
    mockAlpaca.getAccount.mockResolvedValue({ equity: '10000' });

    alpacaTrader([SHORT_POSITION]);
    await flushAllPromises();
    jest.runAllTimers();

    const tslaCalls = Order.SubmitOrder.mock.calls.filter(([sym]) => sym === 'TSLA');
    expect(tslaCalls.length).toBeGreaterThanOrEqual(1);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('handles an empty positions array without throwing', async () => {
    await expect(async () => {
      alpacaTrader([]);
      await flushAllPromises();
      jest.runAllTimers();
    }).not.toThrow();
  });

  it('does not call SubmitOrder when there are no target positions and no portfolio', async () => {
    mockAlpaca.getAssets.mockResolvedValue([]);
    mockAlpaca.getPositions.mockResolvedValue([]);

    alpacaTrader([]);
    await flushAllPromises();
    jest.runAllTimers();

    expect(Order.SubmitOrder).not.toHaveBeenCalled();
  });
});
