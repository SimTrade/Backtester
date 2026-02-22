'use strict';

jest.mock('fs');
const fs = require('fs');
const { writecsvRowSimulation } = require('../Core/writecsvRowSimulation');

describe('writecsvRowSimulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when file already exists', () => {
    beforeEach(() => {
      // fs.stat calls callback with null err → file exists
      fs.stat.mockImplementation((file, cb) => cb(null, {}));
      fs.appendFile.mockImplementation((file, data, cb) => cb(null));
    });

    it('appends the CSV row to the existing file', () => {
      writecsvRowSimulation('AAPL', 0.1, '2024-01-15', 'output.csv', 'symbol,weight,day');

      expect(fs.appendFile).toHaveBeenCalledTimes(1);
      expect(fs.appendFile.mock.calls[0][0]).toBe('output.csv');
      expect(fs.appendFile.mock.calls[0][1]).toBe('AAPL,0.1,2024-01-15\r\n');
    });

    it('does not call writeFile when file exists', () => {
      writecsvRowSimulation('MSFT', 0.2, '2024-01-15', 'output.csv', 'symbol,weight,day');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('when file does not exist', () => {
    beforeEach(() => {
      // fs.stat calls callback with an error → file missing
      fs.stat.mockImplementation((file, cb) => cb(new Error('ENOENT')));
      fs.writeFile.mockImplementation((file, data, cb) => cb(null));
      fs.appendFile.mockImplementation((file, data, cb) => cb(null));
    });

    it('writes the header columns first', () => {
      writecsvRowSimulation('TSLA', 0.05, '2024-01-15', 'new.csv', 'symbol,weight,day');

      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile.mock.calls[0][1]).toBe('symbol,weight,day\r\n');
    });

    it('then appends the CSV row', () => {
      writecsvRowSimulation('TSLA', 0.05, '2024-01-15', 'new.csv', 'symbol,weight,day');

      expect(fs.appendFile).toHaveBeenCalledTimes(1);
      expect(fs.appendFile.mock.calls[0][1]).toBe('TSLA,0.05,2024-01-15\r\n');
    });

    it('writes to the correct file path', () => {
      writecsvRowSimulation('NVDA', 0.15, '2024-01-15', 'trades/output.csv', 'symbol,weight,day');

      expect(fs.writeFile.mock.calls[0][0]).toBe('trades/output.csv');
      expect(fs.appendFile.mock.calls[0][0]).toBe('trades/output.csv');
    });
  });
});
