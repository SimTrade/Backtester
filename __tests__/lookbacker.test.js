'use strict';

// Factory mock — Jest never loads real Order.js so missing Secrets files are irrelevant
jest.mock('../Library/Order', () => ({ GetCalendar: jest.fn() }));
const Order = require('../Library/Order');
const { lookbacker } = require('../Core/lookbacker');

// Helper: makes GetCalendar return true on the Nth call and false before it
function tradingOnCall(trueOnCallNumber) {
  let callCount = 0;
  Order.GetCalendar.mockImplementation((day, cb) => {
    callCount++;
    cb(callCount === trueOnCallNumber);
  });
}

describe('lookbacker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the day before the input when that day is a trading day', (done) => {
    // call 1: input day is trading (true) → check previous day
    // call 2: previous day is trading (true) → resolve
    let callCount = 0;
    Order.GetCalendar.mockImplementation((day, cb) => {
      callCount++;
      cb(true); // every day is a trading day
    });

    lookbacker('2024-01-17', (result) => {
      expect(result).toBe('2024-01-16');
      done();
    });
  });

  it('skips one non-trading day and returns 2 days back', (done) => {
    // call 1: input day = trading → proceed
    // call 2: day-1 = NOT trading → skip
    // call 3: day-2 = trading → resolve
    let callCount = 0;
    Order.GetCalendar.mockImplementation((day, cb) => {
      callCount++;
      if (callCount === 1) cb(true);       // input day: trading
      else if (callCount === 2) cb(false); // day-1: not trading
      else cb(true);                       // day-2: trading
    });

    lookbacker('2024-01-17', (result) => {
      expect(result).toBe('2024-01-15');
      done();
    });
  });

  it('skips two non-trading days and returns 3 days back', (done) => {
    let callCount = 0;
    Order.GetCalendar.mockImplementation((day, cb) => {
      callCount++;
      if (callCount === 1) cb(true);
      else if (callCount === 2) cb(false);
      else if (callCount === 3) cb(false);
      else cb(true);
    });

    lookbacker('2024-01-17', (result) => {
      expect(result).toBe('2024-01-14');
      done();
    });
  });

  it('calls GetCalendar with the correct decremented date strings', (done) => {
    let callCount = 0;
    const calledWith = [];
    Order.GetCalendar.mockImplementation((day, cb) => {
      callCount++;
      calledWith.push(day);
      cb(true); // all days are trading — resolves on call 2 with '2024-01-16'
    });

    lookbacker('2024-01-17', () => {
      expect(calledWith[0]).toBe('2024-01-17');
      expect(calledWith[1]).toBe('2024-01-16');
      done();
    });
  });
});
