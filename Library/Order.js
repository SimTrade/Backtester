var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const paca = require("./Secrets/AlpacaCreds").getCreds();
const KEYID = require("./Secrets/AlpacaCreds").KEYID();
const SECRETKEY = require("./Secrets/AlpacaCreds").SECRETKEY();
var azure = require('azure-storage');
const AzureStorage = require("./AzureStorage")
const { AzureTableAccess } = require("../Core/AzureAccess");

const tableService = AzureTableAccess()
function closeAllPositions() {
  paca.closeAllPositions().then((report) => {
    console.log("closed all positions ");
  });
  paca.cancelAllOrders().then((report) => {
    console.log("closed all positions ");
  });
}

function order(orderQuantity, orderSide, symbol,sharePrice) {
  
  var diff = Number(process.argv[5]?process.argv[5]:0)
  var isNeg = diff < 0
  diff = sharePrice * (1+Math.abs(diff))- sharePrice
  diff = Math.round((Math.abs(diff) - Number.EPSILON) * 100) / 100
  diff = isNeg?-1*diff:diff

  sharePrice = orderSide=="buy"?sharePrice+diff:sharePrice-diff
  sharePrice = Math.round((Math.abs(sharePrice) - Number.EPSILON) * 100) / 100
  
  var type = process.argv[5]?"limit":"market";
  
  if(type=="market"){
    var orderObj = {
      symbol: symbol,
      qty: Math.abs(orderQuantity),
      side: orderSide,
      type: type,
      extended_hours: false,
     
      time_in_force: "day",
    };
  }else{
    var multiple = process.argv[6]?process.argv[6]:1
    var orderObj = {
      symbol: symbol,
      qty: Math.abs(multiple*orderQuantity),//leveraged for premarket since its likely most wont fill
      side: orderSide,
      type: type,
      extended_hours: true,
      limit_price: sharePrice ,
      time_in_force: "day",
    };
  }
  paca.createOrder(orderObj).then((order) => {
    console.log("Order :", order);
  });
}

function IsTradingDay(tradingDay, callback) {
  var get = new Promise(function (resolve, reject) {
    var url =
      "https://paper-api.alpaca.markets/v2/calendar?start=" +
      tradingDay +
      "&end=" +
      tradingDay; 
    var xhttp = new XMLHttpRequest();
   
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        resolve(this.responseText);
      }else{
        console.log(this.responseText)
      }
    };
    xhttp.open("GET", url, false);
    xhttp.setRequestHeader("APCA-API-KEY-ID", KEYID);
    xhttp.setRequestHeader("APCA-API-SECRET-KEY", SECRETKEY);
    xhttp.send();
  });
  get.then(function (json) {
   
    callback(JSON.parse(json)[0].date == tradingDay);
  });
}


module.exports = {
  GetCalendar: function (tradingDay, callback) {
   
    IsTradingDay(tradingDay, callback);
  },
  CancelAllOrders: function () {
    paca.cancelAllOrders();
  },
  CloseAllPositions() {
    closeAllPositions();
  },
  ReOrder: function(orderObj){
    paca.createOrder(orderObj).then((order) => {
      console.log("Order :", order);
    });
  },
  SubmitOrder: function (symbol, weight, sharesExisting, callback) {
   
    paca.getBars("1Min", symbol, {
        limit: 5,
      })
      .then((barset) => {
        var sharePrice = barset[symbol][barset[symbol].length-1].closePrice;
        var volume = barset[symbol][0].volume;

        var ordersRaw = Math.round(weight / sharePrice);
        var shares = Math.abs(Math.round(ordersRaw - sharesExisting));
 var orderSide = "";
        if (Number(ordersRaw) > Number(sharesExisting)) {
          orderSide = "buy";
        } else {
          orderSide = "sell";
        }
        if (
          (ordersRaw > 0 && sharesExisting < 0) ||
          (ordersRaw < 0 && sharesExisting > 0)
        ) {
          // handles switching short to long and vis versa since Alpaca doesn't allow directional change in single order.
          // but not ideal
          shares = Math.abs(sharesExisting);
        }
       
        order(shares, orderSide, symbol,sharePrice);
        
      });
  },
  BetaSector_Report: function (positions, callback) {
    var query1 = new azure.TableQuery();
    var query2 = new azure.TableQuery();
    
    AzureStorage.GetTable(
      "FinnhubListIEX",
      tableService,
      query1,
      function (FinnhubListIEX) {
        AzureStorage.GetTable(
          "PolygonCompany",
          tableService,
          query2,
          function (PolygonCompany) {
            polygonArray = [];
            polygonDict = {};
            finnhubDict = {};
            PolygonCompany.forEach(function (x) {
              if (x.sector == undefined) {
              } else {
                polygonArray.push(Object.values(x.RowKey)[1]);
                polygonDict[Object.values(x.RowKey)[1]] =
                  x.sector != undefined ? Object.values(x.sector)[0] : x;
              }
            });
            FinnhubListIEX.forEach(function (x) {
              if (x.beta == undefined) {
              } else {
                finnhubDict[Object.values(x.RowKey)[1]] =
                  x.beta != undefined
                    ? Object.values(x.beta)[0]
                    : Object.values(x.beta);
              }
            });
          
            var data = {};
            positions.forEach(function (obj) {
              var x = obj.replace("\r", "").split(",");
              data[x[0]] = {
                weight: x[1],
                beta: finnhubDict[x[0]],
                sector: polygonDict[x[0]],
              };
            });
            callback(data);
          }
        );
      }
    );
  },
};


