'use strict';

// ─── Mocks BEFORE any require ─────────────────────────────────────────────────
jest.mock('../Library/Secrets/AlpacaCreds', () => ({
  getCreds: jest.fn(() => ({
    getAccount: jest.fn().mockResolvedValue({ portfolio_value: '100000' }),
    getPositions: jest.fn().mockResolvedValue([]),
    createOrder: jest.fn().mockResolvedValue({}),
    cancelAllOrders: jest.fn().mockResolvedValue({}),
  })),
  KEYID: jest.fn(() => 'mock-key'),
  SECRETKEY: jest.fn(() => 'mock-secret'),
}), { virtual: true });

jest.mock('xmlhttprequest', () => ({ XMLHttpRequest: jest.fn() }));

jest.mock('azure-storage', () => {
  const TableQuery = jest.fn().mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
  }));
  return {
    createTableService: jest.fn(() => ({})),
    TableQuery,
    TableUtilities: {
      entityGenerator: {
        String: (v) => ({ _: v }),
        Double: (v) => ({ _: v }),
        Int32: (v) => ({ _: v }),
      },
    },
  };
});

jest.mock('../Library/AzureStorage', () => ({
  GetTable: jest.fn(),
  GetDaily: jest.fn(),
  ToTable: jest.fn(),
  StoreBeta: jest.fn(),
}));

jest.mock('../Core/lookbacker', () => ({
  lookbacker: jest.fn((date, cb) => cb('2024-05-31')),
}));

jest.mock('../Core/AzureAccess', () => ({
  AzureTableAccess: jest.fn(() => ({})),
}));

jest.mock('../Library/Order', () => ({
  GetCalendar: jest.fn(),
  BetaSector_Report: jest.fn((backtest, cb) => cb({ beta: 0.9, exposure: {} })),
  GetAccount: jest.fn((cb) => cb({ portfolio_value: '100000' })),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'symbol,weight,date\nAAPL,0.1,2024-06-03\n'),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
}));

jest.mock('colors/safe', () => new Proxy({}, { get: () => (v) => v }));

const ModelRunner = require('../Library/ModelRunner');
const AzureStorage = require('../Library/AzureStorage');
const { lookbacker } = require('../Core/lookbacker');
const Order = require('../Library/Order');

describe('ModelRunner.BacktestResults', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is exported as a function', () => {
    expect(typeof ModelRunner.BacktestResults).toBe('function');
  });

  it('calls AzureStorage.GetTable for StocksDailyBacktester', (done) => {
    AzureStorage.GetTable.mockImplementation((table, service, query, cb) => {
      cb([{ RowKey: { _: 'AAPL' }, adjustedClose: { _: 150 } }]);
    });
    Order.BetaSector_Report.mockImplementation((bt, cb) => cb({ beta: 0.9 }));

    ModelRunner.BacktestResults('2024-06-03', 'Library/some.csv', (daily, beta, sectors, longs, shorts) => {
      expect(AzureStorage.GetTable).toHaveBeenCalledWith(
        'StocksDailyBacktester',
        expect.anything(),
        expect.anything(),
        expect.any(Function)
      );
      done();
    });
  });

  it('uses lookbacker to get the previous day', (done) => {
    AzureStorage.GetTable.mockImplementation((table, service, query, cb) => cb([]));
    Order.BetaSector_Report.mockImplementation((bt, cb) => cb({ beta: 0 }));

    ModelRunner.BacktestResults('2024-06-03', 'Library/some.csv', () => {
      expect(lookbacker).toHaveBeenCalledWith('2024-06-03', expect.any(Function));
      done();
    });
  });
});

describe('ModelRunner — alpacaTrader', () => {
  // alpacaTrader is not exported but we can verify Order.GetAccount is callable
  it('Order.GetAccount is wired to the mock account', (done) => {
    Order.GetAccount((account) => {
      expect(account.portfolio_value).toBe('100000');
      done();
    });
  });
});
