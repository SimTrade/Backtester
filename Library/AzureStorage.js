"use strict"

var entities = []

function GetTable(tableName, tableService, query, callback, nextContinuationToken) {


  tableService.queryEntities(tableName, query, nextContinuationToken, function (error, results) {
    if (error) {
      console.log (error)
    }
    else {
      results.entries.forEach(function (x) {
        entities.push(x)
      })

      if (results.continuationToken) {
        GetTable(tableName, tableService, query, callback, results.continuationToken);
      }
      else {
        var entry = entities
        entities = []
        callback(entry)
      }
    }
  });
}


function GetDaily(token,tableName, tableService, query,dataArray, callback) {
  tableService.queryEntities(tableName, query, token, function (error, result) {
    if (!error) {
      dataArray.push.apply(dataArray, result.entries);  
      var token = result.continuationToken;
      if (token) {  
          
        GetDaily(token,tableName, tableService, query,dataArray, callback)
      }
      else{
        callback(dataArray)
      }
  }
  });
}

module.exports = {
  GetDaily: function (tableName, tableService, query, callback) {
    var dataArray = []
    GetDaily(null,tableName, tableService, query,dataArray, callback)
  },
  GetTable: function (tableName, tableService, query, callback) {
    GetTable(tableName, tableService, query, callback, null)
  },
  
}