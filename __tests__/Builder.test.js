'use strict';

// ---------------------------------------------------------------------------
// Mocks — hoisted before any require()
// ---------------------------------------------------------------------------

jest.mock('azure-storage', () => ({
  TableQuery: jest.fn().mockImplementation(() => ({
    where: jest.fn().mockReturnThis(),
  })),
  createTableServiceWithSas: jest.fn(() => ({})),
}));

jest.mock('../Core/AzureAccess', () => ({
  AzureTableAccess: jest.fn(() => ({})), // returns dummy tableService
}));

jest.mock('../Library/AzureStorage', () => ({
  GetDaily: jest.fn(),
  GetTable: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Module references
// ---------------------------------------------------------------------------

const AzureStorage = require('../Library/AzureStorage');
const Builder      = require('../Library/Builder');

// ---------------------------------------------------------------------------
// Entity helper
// ---------------------------------------------------------------------------

/**
 * Wrap a value in the Azure Table Storage entity format.
 * objectValues({ _: val }) returns val because the first Object.values()
 * entry (`val`) does not match "Edm.Double" or "Edm.String".
 */
function e(val) { return { _: val }; }

/**
 * Build a company entity with all fields required by beniesh(), altmanScore(),
 * piotroskiScore(), topDeltas(), and Net_IncomeDelta() using sane numbers
 * that do not produce NaN results.
 */
function makeEquity(symbol, overrides = {}) {
  return {
    RowKey: e(symbol),
    PartitionKey: e('2024-01-15'),

    // beniesh() fields
    Revenue:                              e(1000),  Revenue_LastYear:                       e(900),
    Receivables:                          e(100),   Receivables_LastYear:                   e(90),
    SGA_Expenses:                         e(50),    SGA_Expenses_LastYear:                  e(45),
    Cost_of_Revenue:                      e(400),   Cost_of_Revenue_LastYear:               e(360),
    Depreciation__Amortization:           e(20),    Depreciation__Amortization_LastYear:    e(18),
    Income_from_Continuous_Operations:    e(200),   Income_from_Continuous_Operations_LastYear: e(180),
    Total_current_assets:                 e(500),   Total_current_assets_LastYear:           e(450),
    Property_Plant_Equpment_Net:          e(300),   Property_Plant_Equpment_Net_LastYear:    e(270),
    Total_Assets:                         e(1200),  Total_Assets_LastYear:                   e(1080),
    Total_liabilities:                    e(600),   Total_liabilities_LastYear:              e(540),
    Total_Debt:                           e(200),   Total_Debt_LastYear:                     e(180),
    Operating_Cash_Flow:                  e(150),   Operating_Cash_Flow_LastYear:            e(135),

    // altmanScore() fields
    Total_current_liabilities_LastYear:   e(300),
    Retained_Earnings_LastYear:           e(400),
    EBIT_LastYear:                        e(200),
    Market_Cap_LastYear:                  e(2000),
    EV_Sales_LastYear:                    e(2),
    EV_EBIT_LastYear:                     e(10),

    // piotroskiScore() fields
    Net_Income:                           e(200),
    Net_Income_LastYear:                  e(180),

    // topDeltas() fields
    P_E_ratio:                e(20),    P_E_ratio_LastYear:          e(18),
    Asset_Turnover:           e(0.8),   Asset_Turnover_LastYear:     e(0.75),
    Financing_cash_flow:      e(-50),   Financing_cash_flow_LastYear: e(-45),
    Enterprise_Value:         e(2500),  Enterprise_Value_LastYear:    e(2200),
    Market_Cap:               e(2000),  Market_Cap_LastYear:          e(1800),
    EV_Sales:                 e(2),

    ...overrides,
  };
}

/** Minimal ShortVolume entity for ta(). */
function makeShortVol(symbol, growthDiff, shortDay, shortWeekAvg) {
  return { RowKey: e(symbol), growthDiff: e(growthDiff), shortDay: e(shortDay), shortWeekAvg: e(shortWeekAvg) };
}

/** Minimal ADDaily entity for ta(). */
function makeADDaily(symbol, adLine) {
  return { RowKey: e(symbol), AD_Line: e(adLine) };
}

/** Minimal CCI20Day entity for ta(). */
function makeCCI(symbol, cci) {
  return { RowKey: e(symbol), CCI: e(cci) };
}

/** Minimal BBandsDaily entity for ta(). */
function makeBBand(symbol, lower, middle, upper) {
  return {
    RowKey: e(symbol),
    Real_Lower_Band:  e(lower),
    Real_Middle_Band: e(middle),
    Real_Upper_Band:  e(upper),
  };
}

// ---------------------------------------------------------------------------
// Route GetDaily / GetTable based on table name
// ---------------------------------------------------------------------------

/**
 * Configure AzureStorage.GetDaily so each table name maps to a data array.
 * Any table not listed returns [].
 */
function routeGetDaily(tableMap) {
  AzureStorage.GetDaily.mockImplementation((tableName, _ts, _q, cb) => {
    cb(tableMap[tableName] || []);
  });
}

/** Configure AzureStorage.GetTable the same way. */
function routeGetTable(tableMap) {
  AzureStorage.GetTable.mockImplementation((tableName, _ts, _q, cb) => {
    cb(tableMap[tableName] || []);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => jest.clearAllMocks());

// ============================================================================
// GetMacro
// ============================================================================

describe('Builder.GetMacro', () => {
  it('calls the callback', (done) => {
    routeGetDaily({ Macro: [], COT: [], SectorSharpe: [] });

    Builder.GetMacro('2024-01-15', (result) => {
      expect(result).toBeDefined();
      done();
    });
  });

  it('calls GetDaily with Macro, COT, and SectorSharpe', (done) => {
    routeGetDaily({ Macro: [], COT: [], SectorSharpe: [] });

    Builder.GetMacro('2024-01-15', () => {
      const tables = AzureStorage.GetDaily.mock.calls.map(([t]) => t);
      expect(tables).toContain('Macro');
      expect(tables).toContain('COT');
      expect(tables).toContain('SectorSharpe');
      done();
    });
  });

  it('merges non-metadata keys from Macro into the masterDict', (done) => {
    routeGetDaily({
      Macro:       [{ RowKey: e('2024-01-15'), interestRate: e(5.25) }],
      COT:         [{ RowKey: e('2024-01-15'), netLong: e(100) }],
      SectorSharpe:[],
    });

    Builder.GetMacro('2024-01-15', (result) => {
      expect(result).toHaveProperty('interestRate', 5.25);
      done();
    });
  });

  it('uses the last COT entry for merging (cot[cot.length-1])', (done) => {
    routeGetDaily({
      Macro:        [],
      COT:          [
        { RowKey: e('2024-01-01'), netLong: e(10) },
        { RowKey: e('2024-01-15'), netLong: e(99) }, // last entry wins
      ],
      SectorSharpe: [],
    });

    Builder.GetMacro('2024-01-15', (result) => {
      expect(result).toHaveProperty('netLong', 99);
      done();
    });
  });

  it('excludes keys that include "vix" from the masterDict', (done) => {
    routeGetDaily({
      Macro: [{ RowKey: e('2024-01-15'), vixClose: e(18), interestRate: e(5) }],
      COT: [], SectorSharpe: [],
    });

    Builder.GetMacro('2024-01-15', (result) => {
      expect(result).not.toHaveProperty('vixClose');
      expect(result).toHaveProperty('interestRate');
      done();
    });
  });

  it('excludes PartitionKey, RowKey, Timestamp, and .metadata from the masterDict', (done) => {
    routeGetDaily({
      Macro:        [{ RowKey: e('r'), PartitionKey: e('p'), Timestamp: e('t'), '.metadata': e('m'), value: e(42) }],
      COT:          [],
      SectorSharpe: [],
    });

    Builder.GetMacro('2024-01-15', (result) => {
      expect(result).not.toHaveProperty('RowKey');
      expect(result).not.toHaveProperty('PartitionKey');
      expect(result).not.toHaveProperty('Timestamp');
      expect(result).not.toHaveProperty('.metadata');
      expect(result).toHaveProperty('value', 42);
      done();
    });
  });
});

// ============================================================================
// GetNullShort
// ============================================================================

describe('Builder.GetNullShort', () => {
  it('calls the callback with an array', (done) => {
    routeGetDaily({ PickList5000: [] });

    Builder.GetNullShort('2024-01-15', (result) => {
      expect(Array.isArray(result)).toBe(true);
      done();
    });
  });

  it('calls GetDaily with PickList5000', (done) => {
    routeGetDaily({ PickList5000: [] });

    Builder.GetNullShort('2024-01-15', () => {
      expect(AzureStorage.GetDaily.mock.calls[0][0]).toBe('PickList5000');
      done();
    });
  });

  it('includes companies with a valid (non-NaN) beniesh score', (done) => {
    const company = makeEquity('AAPL');
    routeGetDaily({ PickList5000: [company] });

    Builder.GetNullShort('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe('AAPL');
      done();
    });
  });

  it('excludes companies whose beniesh score is NaN (missing financial fields)', (done) => {
    // A company with no financial fields → all values are undefined → beniesh returns NaN
    routeGetDaily({ PickList5000: [{ RowKey: e('EMPTY') }] });

    Builder.GetNullShort('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('each result item has symbol, score, beniesh, and equity properties', (done) => {
    routeGetDaily({ PickList5000: [makeEquity('MSFT')] });

    Builder.GetNullShort('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      const item = result[0];
      expect(item).toHaveProperty('symbol', 'MSFT');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('beniesh');
      expect(item).toHaveProperty('equity');
      done();
    });
  });
});

// ============================================================================
// GetDelta
// ============================================================================

describe('Builder.GetDelta', () => {
  it('calls the callback with an array', (done) => {
    routeGetDaily({ PickList5000: [] });

    Builder.GetDelta('2024-01-15', (result) => {
      expect(Array.isArray(result)).toBe(true);
      done();
    });
  });

  it('calls GetDaily with PickList5000', (done) => {
    routeGetDaily({ PickList5000: [] });

    Builder.GetDelta('2024-01-15', () => {
      expect(AzureStorage.GetDaily.mock.calls[0][0]).toBe('PickList5000');
      done();
    });
  });

  it('each result item has symbol, score, and zScore properties', (done) => {
    routeGetDaily({ PickList5000: [makeEquity('GOOG')] });

    Builder.GetDelta('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      const item = result[0];
      expect(item).toHaveProperty('symbol', 'GOOG');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('zScore');
      done();
    });
  });

  it('returns an entry for every company in PickList5000', (done) => {
    routeGetDaily({ PickList5000: [makeEquity('X'), makeEquity('Y'), makeEquity('Z')] });

    Builder.GetDelta('2024-01-15', (result) => {
      expect(result.length).toBe(3);
      done();
    });
  });
});

// ============================================================================
// GetEquities
// ============================================================================

describe('Builder.GetEquities', () => {
  /**
   * Build a GetDaily route table where the given symbol appears in all
   * five required tables (fundamentals, shortVolume, adDaily, fiftyDay, cci).
   */
  function allTablesForSymbol(symbol) {
    const equity = makeEquity(symbol);
    const minimal = { RowKey: e(symbol) };
    return {
      PolygonCompany:       [{ RowKey: e(symbol), sector: e('Tech'), industry: e('Software') }],
      PickList5000:         [equity],
      WsjTarget:            [],
      Zacks:                [],
      SMA20Day:             [{ RowKey: e(symbol), SMA: e(150) }],
      StocksMonthlyGrowth:  [{ RowKey: e(symbol), growth: e(0.05) }],
      SMA50Day:             [{ RowKey: e(symbol), SMA: e(140) }],
      CCI20Day:             [{ RowKey: e(symbol), CCI: e(50)  }],
      Barcharts:            [],
      AdDaily:              [{ RowKey: e(symbol), AD_Line: e(200) }],
      ShortVolume:          [{ RowKey: e(symbol), growthDiff: e(0.1) }],
      IEX:                  [{ RowKey: e(symbol), pe: e(18) }],
    };
  }

  it('calls the callback with an array', (done) => {
    routeGetDaily(allTablesForSymbol('AAPL'));

    Builder.GetEquities('2024-01-15', (result) => {
      expect(Array.isArray(result)).toBe(true);
      done();
    });
  });

  it('includes a symbol that has entries in all five required tables', (done) => {
    routeGetDaily(allTablesForSymbol('NVDA'));

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      expect(result[0].RowKey).toBe('NVDA');
      done();
    });
  });

  it('excludes a symbol missing from the ShortVolume table', (done) => {
    const map = allTablesForSymbol('AAPL');
    map.ShortVolume = []; // remove AAPL from ShortVolume

    routeGetDaily(map);

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('excludes a symbol missing from the AdDaily table', (done) => {
    const map = allTablesForSymbol('AAPL');
    map.AdDaily = [];

    routeGetDaily(map);

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('excludes a symbol missing from the SMA50Day table', (done) => {
    const map = allTablesForSymbol('AAPL');
    map.SMA50Day = [];

    routeGetDaily(map);

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('excludes a symbol missing from the CCI20Day table', (done) => {
    const map = allTablesForSymbol('AAPL');
    map.CCI20Day = [];

    routeGetDaily(map);

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('maps sector and industry from PolygonCompany', (done) => {
    routeGetDaily(allTablesForSymbol('AAPL'));

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      expect(result[0]).toHaveProperty('sector',   'Tech');
      expect(result[0]).toHaveProperty('industry', 'Software');
      done();
    });
  });

  it('maps Sma20 from SMA20Day.SMA', (done) => {
    routeGetDaily(allTablesForSymbol('AAPL'));

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result[0]).toHaveProperty('Sma20', 150);
      done();
    });
  });

  it('maps Sma50 from SMA50Day.SMA', (done) => {
    routeGetDaily(allTablesForSymbol('AAPL'));

    Builder.GetEquities('2024-01-15', (result) => {
      expect(result[0]).toHaveProperty('Sma50', 140);
      done();
    });
  });

  it('calls GetDaily for all twelve tables', (done) => {
    routeGetDaily(allTablesForSymbol('AAPL'));

    Builder.GetEquities('2024-01-15', () => {
      const queried = AzureStorage.GetDaily.mock.calls.map(([t]) => t);
      [
        'PolygonCompany','PickList5000','WsjTarget','Zacks','SMA20Day',
        'StocksMonthlyGrowth','SMA50Day','CCI20Day','Barcharts','AdDaily',
        'ShortVolume','IEX',
      ].forEach((t) => expect(queried).toContain(t));
      done();
    });
  });
});

// ============================================================================
// GetMonster
// ============================================================================

describe('Builder.GetMonster', () => {
  it('calls the callback with an array', (done) => {
    routeGetDaily({ PickList5000: [] });
    routeGetTable({ ShortVolume: [] });

    Builder.GetMonster('2024-01-15', (result) => {
      expect(Array.isArray(result)).toBe(true);
      done();
    });
  });

  it('calls GetDaily with PickList5000 and GetTable with ShortVolume', (done) => {
    routeGetDaily({ PickList5000: [] });
    routeGetTable({ ShortVolume: [] });

    Builder.GetMonster('2024-01-15', () => {
      expect(AzureStorage.GetDaily.mock.calls[0][0]).toBe('PickList5000');
      expect(AzureStorage.GetTable.mock.calls[0][0]).toBe('ShortVolume');
      done();
    });
  });

  it('each result item has altman, symbol, netDelta, peDelta, and shortV properties', (done) => {
    routeGetDaily({ PickList5000: [makeEquity('MSFT')] });
    routeGetTable({
      ShortVolume: [{ RowKey: e('MSFT'), growthDiff: e(0.2) }],
    });

    Builder.GetMonster('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      const item = result[0];
      expect(item).toHaveProperty('symbol', 'MSFT');
      expect(item).toHaveProperty('altman');
      expect(item).toHaveProperty('netDelta');
      expect(item).toHaveProperty('peDelta');
      expect(item).toHaveProperty('shortV');
      done();
    });
  });

  it('excludes companies where Net_IncomeDelta is NaN', (done) => {
    // Company with no Net_Income fields → Net_IncomeDelta returns NaN → excluded
    routeGetDaily({ PickList5000: [{ RowKey: e('EMPTY') }] });
    routeGetTable({ ShortVolume: [] });

    Builder.GetMonster('2024-01-15', (result) => {
      expect(result.length).toBe(0);
      done();
    });
  });

  it('falls back shortV to 0 for symbols not present in ShortVolume table', (done) => {
    routeGetDaily({ PickList5000: [makeEquity('AMD')] });
    routeGetTable({ ShortVolume: [] }); // AMD not in ShortVolume

    Builder.GetMonster('2024-01-15', (result) => {
      expect(result.length).toBe(1);
      expect(result[0].shortV).toBe(0);
      done();
    });
  });
});

// ============================================================================
// ta
// ============================================================================

describe('Builder.ta', () => {
  it('calls the callback with two arrays (keeplong, keepshort)', (done) => {
    routeGetDaily({
      ShortVolume: [], BBandsDaily: [], ADDaily: [], CCI20Day: [],
    });

    Builder.ta('2024-01-15', (keeplong, keepshort) => {
      expect(Array.isArray(keeplong)).toBe(true);
      expect(Array.isArray(keepshort)).toBe(true);
      done();
    });
  });

  it('calls GetDaily with ShortVolume, BBandsDaily, ADDaily, and CCI20Day', (done) => {
    routeGetDaily({
      ShortVolume: [], BBandsDaily: [], ADDaily: [], CCI20Day: [],
    });

    Builder.ta('2024-01-15', () => {
      const tables = AzureStorage.GetDaily.mock.calls.map(([t]) => t);
      expect(tables).toContain('ShortVolume');
      expect(tables).toContain('BBandsDaily');
      expect(tables).toContain('ADDaily');
      expect(tables).toContain('CCI20Day');
      done();
    });
  });

  it('adds a symbol to keeplong when shortvolDict is negative and it is not a loser', (done) => {
    // Single ShortVolume entry with growthDiff < 0 (not in top-20% losers with 1 entry)
    routeGetDaily({
      ShortVolume: [makeShortVol('AAPL', -0.5, 80, 90)],   // growthDiff < 0 → qualifies keeplong
      ADDaily:     [makeADDaily('AAPL', 12)],               // positive AD
      CCI20Day:    [makeCCI('AAPL', 30)],
      BBandsDaily: [makeBBand('AAPL', 90, 100, 110)],
    });

    Builder.ta('2024-01-15', (keeplong) => {
      expect(keeplong.length).toBe(1);
      expect(keeplong[0].symbol).toBe('AAPL');
      expect(typeof keeplong[0].score).toBe('number');
      done();
    });
  });

  it('keeplong score equals Math.abs of AD_Line value', (done) => {
    routeGetDaily({
      ShortVolume: [makeShortVol('AAPL', -0.5, 80, 90)],
      ADDaily:     [makeADDaily('AAPL', 7)],
      CCI20Day:    [makeCCI('AAPL', 30)],
      BBandsDaily: [makeBBand('AAPL', 90, 100, 110)],
    });

    Builder.ta('2024-01-15', (keeplong) => {
      expect(keeplong[0].score).toBe(Math.abs(7));
      done();
    });
  });

  it('does not add a symbol to keeplong when shortvolDict is non-negative', (done) => {
    routeGetDaily({
      ShortVolume: [makeShortVol('AAPL', 0.5, 80, 70)],  // growthDiff >= 0
      ADDaily:     [makeADDaily('AAPL', 5)],
      CCI20Day:    [makeCCI('AAPL', 30)],
      BBandsDaily: [makeBBand('AAPL', 90, 100, 110)],
    });

    Builder.ta('2024-01-15', (keeplong) => {
      const aaplLong = keeplong.filter((x) => x.symbol === 'AAPL');
      expect(aaplLong.length).toBe(0);
      done();
    });
  });
});
