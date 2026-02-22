'use strict';

const AzureStorage = require('../Library/AzureStorage');

function makeTableService(pages) {
  // pages: array of { entries, continuationToken } — simulates paginated Azure responses
  let call = 0;
  return {
    queryEntities: jest.fn((tableName, query, token, cb) => {
      const page = pages[call++] || { entries: [], continuationToken: null };
      cb(null, page);
    }),
  };
}

describe('AzureStorage.GetTable', () => {
  it('returns all entries from a single-page result', (done) => {
    const tableService = makeTableService([
      { entries: [{ id: 1 }, { id: 2 }], continuationToken: null },
    ]);

    AzureStorage.GetTable('MyTable', tableService, {}, (result) => {
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      done();
    });
  });

  it('accumulates entries across multiple pages (pagination)', (done) => {
    const tableService = makeTableService([
      { entries: [{ id: 1 }], continuationToken: 'token1' },
      { entries: [{ id: 2 }], continuationToken: 'token2' },
      { entries: [{ id: 3 }], continuationToken: null },
    ]);

    AzureStorage.GetTable('MyTable', tableService, {}, (result) => {
      expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
      done();
    });
  });

  it('calls queryEntities with the correct table name', (done) => {
    const tableService = makeTableService([{ entries: [], continuationToken: null }]);

    AzureStorage.GetTable('TargetTable', tableService, {}, () => {
      expect(tableService.queryEntities.mock.calls[0][0]).toBe('TargetTable');
      done();
    });
  });

  it('calls queryEntities with null as the initial continuation token', (done) => {
    const tableService = makeTableService([{ entries: [], continuationToken: null }]);

    AzureStorage.GetTable('T', tableService, {}, () => {
      expect(tableService.queryEntities.mock.calls[0][2]).toBeNull();
      done();
    });
  });

  it('passes the continuation token from page N to the next queryEntities call', (done) => {
    const tableService = makeTableService([
      { entries: [], continuationToken: 'tok-abc' },
      { entries: [], continuationToken: null },
    ]);

    AzureStorage.GetTable('T', tableService, {}, () => {
      expect(tableService.queryEntities.mock.calls[1][2]).toBe('tok-abc');
      done();
    });
  });

  it('returns an empty array when the table has no entries', (done) => {
    const tableService = makeTableService([{ entries: [], continuationToken: null }]);

    AzureStorage.GetTable('EmptyTable', tableService, {}, (result) => {
      expect(result).toEqual([]);
      done();
    });
  });
});

describe('AzureStorage.GetDaily', () => {
  it('returns entries from a single page', (done) => {
    const tableService = makeTableService([
      { entries: [{ price: 100 }], continuationToken: null },
    ]);

    AzureStorage.GetDaily('DailyTable', tableService, {}, (result) => {
      expect(result).toEqual([{ price: 100 }]);
      done();
    });
  });

  it('accumulates entries across multiple pages', (done) => {
    const tableService = makeTableService([
      { entries: [{ price: 100 }], continuationToken: 'next' },
      { entries: [{ price: 101 }], continuationToken: null },
    ]);

    AzureStorage.GetDaily('DailyTable', tableService, {}, (result) => {
      expect(result).toEqual([{ price: 100 }, { price: 101 }]);
      done();
    });
  });

  it('calls callback with empty array when no entries', (done) => {
    const tableService = makeTableService([{ entries: [], continuationToken: null }]);

    AzureStorage.GetDaily('DailyTable', tableService, {}, (result) => {
      expect(result).toEqual([]);
      done();
    });
  });
});
