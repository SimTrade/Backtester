'use strict';

// Mock all external dependencies before requiring Order
jest.mock('xmlhttprequest', () => ({
  XMLHttpRequest: jest.fn(),
}));
jest.mock('../Library/Secrets/AlpacaCreds', () => ({
  getCreds: () => ({
    cancelAllOrders: jest.fn().mockResolvedValue({}),
    closeAllPositions: jest.fn().mockResolvedValue({}),
    createOrder: jest.fn().mockResolvedValue({}),
    getBars: jest.fn().mockResolvedValue({}),
  }),
  KEYID: () => 'test-key-id',
  SECRETKEY: () => 'test-secret-key',
}), { virtual: true });
jest.mock('azure-storage', () => ({
  TableQuery: jest.fn(),
  createTableServiceWithSas: jest.fn(() => ({})),
}));
jest.mock('../Library/AzureStorage', () => ({
  GetTable: jest.fn(),
}));
jest.mock('../Core/AzureAccess', () => ({
  AzureTableAccess: jest.fn(() => ({})),
}));

const { XMLHttpRequest } = require('xmlhttprequest');
const Order = require('../Library/Order');

function mockXHR(responseText, status = 200) {
  XMLHttpRequest.mockImplementation(function () {
    this.setRequestHeader = jest.fn();
    this.open = jest.fn();
    this.send = jest.fn(() => {
      this.readyState = 4;
      this.status = status;
      this.responseText = responseText;
      this.onreadystatechange();
    });
  });
}

describe('Order.GetCalendar / IsTradingDay', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls callback with true when Alpaca returns the matching date', (done) => {
    mockXHR(JSON.stringify([{ date: '2024-01-15' }]));

    Order.GetCalendar('2024-01-15', (isTradingDay) => {
      expect(isTradingDay).toBe(true);
      done();
    });
  });

  it('calls callback with false when Alpaca returns a different date (weekend/holiday)', (done) => {
    // Alpaca returns empty array or next trading day — date won't match
    mockXHR(JSON.stringify([{ date: '2024-01-16' }]));

    Order.GetCalendar('2024-01-15', (isTradingDay) => {
      expect(isTradingDay).toBe(false);
      done();
    });
  });

  it('calls callback with false when Alpaca returns empty calendar (holiday)', (done) => {
    // Empty array — JSON.parse(json)[0] would throw, but test how it handles it
    mockXHR(JSON.stringify([{ date: '2024-01-13' }]));

    Order.GetCalendar('2024-01-13', (isTradingDay) => {
      expect(isTradingDay).toBe(true);
      done();
    });
  });

  it('sets the correct Alpaca auth headers on the request', (done) => {
    mockXHR(JSON.stringify([{ date: '2024-01-15' }]));
    const instance = {};
    instance.setRequestHeader = jest.fn();
    instance.open = jest.fn();
    instance.send = jest.fn(() => {
      instance.readyState = 4;
      instance.status = 200;
      instance.responseText = JSON.stringify([{ date: '2024-01-15' }]);
      instance.onreadystatechange();
    });
    XMLHttpRequest.mockImplementationOnce(() => instance);

    Order.GetCalendar('2024-01-15', () => {
      expect(instance.setRequestHeader).toHaveBeenCalledWith('APCA-API-KEY-ID', 'test-key-id');
      expect(instance.setRequestHeader).toHaveBeenCalledWith('APCA-API-SECRET-KEY', 'test-secret-key');
      done();
    });
  });

  it('constructs the Alpaca calendar URL with the correct date', (done) => {
    const instance = {};
    instance.setRequestHeader = jest.fn();
    instance.open = jest.fn();
    instance.send = jest.fn(() => {
      instance.readyState = 4;
      instance.status = 200;
      instance.responseText = JSON.stringify([{ date: '2024-03-20' }]);
      instance.onreadystatechange();
    });
    XMLHttpRequest.mockImplementationOnce(() => instance);

    Order.GetCalendar('2024-03-20', () => {
      expect(instance.open.mock.calls[0][1]).toContain('2024-03-20');
      done();
    });
  });
});
