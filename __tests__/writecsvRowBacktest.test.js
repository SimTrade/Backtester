'use strict';

jest.mock('fs');
const fs = require('fs');
const { writecsvRowBacktest } = require('../Core/writecsvRowBacktest');

const BASE_ARGS = {
  backDate: '2024-01-15',
  returns: 12.345,
  growth: 0.234,
  sharpe: 1.12,
  sortino: 1.45,
  beta: 0.98,
  longs: 10,
  shorts: 3,
  maxDrawdown: -4.5,
  gainToPain: 2.1,
  sectors: {},
  file: 'output/backtest.csv',
  columns: 'day,returns,growth,sharpe,sqRtSortino,beta,longs,shorts,maxDrawdown,gainToPain',
};

function callWrite(overrides = {}) {
  const a = { ...BASE_ARGS, ...overrides };
  writecsvRowBacktest(
    a.backDate, a.returns, a.growth, a.sharpe, a.sortino,
    a.beta, a.longs, a.shorts, a.maxDrawdown, a.gainToPain,
    a.sectors, a.file, a.columns
  );
}

describe('writecsvRowBacktest', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('CSV row formatting', () => {
    beforeEach(() => {
      fs.stat.mockImplementation((file, cb) => cb(null, {}));
      fs.appendFile.mockImplementation((file, data, cb) => cb(null));
    });

    it('formats all numeric columns correctly in the CSV row', () => {
      callWrite();
      const row = fs.appendFile.mock.calls[0][1];
      expect(row).toBe('2024-01-15,12.345,0.234,1.12,1.45,0.98,10,3,-4.5,2.1\r\n');
    });

    it('appends sector values when sectors object has numeric entries', () => {
      callWrite({ sectors: { Technology: 0.45, Healthcare: 0.22 } });
      const row = fs.appendFile.mock.calls[0][1];
      expect(row).toContain(',0.45,0.22');
    });

    it('skips sector entries with NaN values', () => {
      callWrite({ sectors: { Technology: NaN, Healthcare: 0.22 } });
      const row = fs.appendFile.mock.calls[0][1];
      expect(row).not.toContain('NaN');
      expect(row).toContain(',0.22');
    });

    it('appends sector keys to the columns header string when sectors exist', () => {
      fs.stat.mockImplementation((file, cb) => cb(new Error('ENOENT')));
      fs.writeFile.mockImplementation((file, data, cb) => cb(null));
      callWrite({ sectors: { Technology: 0.45 } });
      const header = fs.writeFile.mock.calls[0][1];
      expect(header).toContain(',Technology');
    });
  });

  describe('when file already exists', () => {
    beforeEach(() => {
      fs.stat.mockImplementation((file, cb) => cb(null, {}));
      fs.appendFile.mockImplementation((file, data, cb) => cb(null));
    });

    it('appends row to existing file', () => {
      callWrite();
      expect(fs.appendFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('writes to the correct file path', () => {
      callWrite({ file: 'results/myAlgo.csv' });
      expect(fs.appendFile.mock.calls[0][0]).toBe('results/myAlgo.csv');
    });
  });

  describe('when file does not exist', () => {
    beforeEach(() => {
      fs.stat.mockImplementation((file, cb) => cb(new Error('ENOENT')));
      fs.writeFile.mockImplementation((file, data, cb) => cb(null));
      fs.appendFile.mockImplementation((file, data, cb) => cb(null));
    });

    it('writes column headers first', () => {
      callWrite();
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile.mock.calls[0][1]).toContain('day,returns,growth,sharpe');
    });

    it('then appends the data row', () => {
      callWrite();
      expect(fs.appendFile).toHaveBeenCalledTimes(1);
    });

    it('both writes target the same file path', () => {
      callWrite({ file: 'out/run1.csv' });
      expect(fs.writeFile.mock.calls[0][0]).toBe('out/run1.csv');
      expect(fs.appendFile.mock.calls[0][0]).toBe('out/run1.csv');
    });
  });
});
