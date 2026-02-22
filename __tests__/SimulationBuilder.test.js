'use strict';

// Mock lookback before requiring SimulationBuilder
jest.mock('../Core/lookback', () => ({
  lookback: jest.fn(),
}));

const { lookback } = require('../Core/lookback');
const { SimulationBuilder } = require('../Core/SimulationBuilder');

describe('SimulationBuilder', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls lookback (indexAdder+1) times after all timeouts fire', () => {
    SimulationBuilder('test.csv', 3, 100, 'method1', 'someCallback');
    jest.runAllTimers();
    // indexAdder=3 → i=0,1,2,3 → 4 calls
    expect(lookback).toHaveBeenCalledTimes(4);
  });

  it('passes the correct file argument to each lookback call', () => {
    SimulationBuilder('equities.csv', 2, 50, 'backtest', 'cb');
    jest.runAllTimers();
    lookback.mock.calls.forEach(([day, file, method, flag, back]) => {
      expect(file).toBe('equities.csv');
    });
  });

  it('passes the method and back arguments through unchanged', () => {
    SimulationBuilder('x.csv', 1, 1, 'simulation', 'myCallback');
    jest.runAllTimers();
    lookback.mock.calls.forEach(([day, file, method, flag, back]) => {
      expect(method).toBe('simulation');
      expect(back).toBe('myCallback');
      expect(flag).toBe(false);
    });
  });

  it('each call receives a unique past date string (YYYY-MM-DD)', () => {
    SimulationBuilder('x.csv', 4, 1, 'method', 'cb');
    jest.runAllTimers();
    const dates = lookback.mock.calls.map(([day]) => day);
    // All should match ISO date format
    dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    // Dates should be distinct (each daysback is different)
    const unique = new Set(dates);
    expect(unique.size).toBe(5); // indexAdder=4 → 5 iterations
  });

  it('schedules the last iteration (i==indexAdder) with a delay of 1ms', () => {
    // When i==indexAdder the ternary returns 1; all others return (indexAdder-i)*incrementer
    // We verify by checking the last timer fires (covered by runAllTimers passing)
    const spy = jest.spyOn(global, 'setTimeout');
    SimulationBuilder('x.csv', 2, 500, 'method', 'cb');
    // i=0: delay=(2-0)*500=1000, i=1: (2-1)*500=500, i=2 (==indexAdder): 1
    const delays = spy.mock.calls.map(([fn, delay]) => delay);
    expect(delays).toContain(1);
    jest.runAllTimers();
    spy.mockRestore();
  });
});
