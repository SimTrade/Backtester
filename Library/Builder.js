"use strict";
const { AzureTableAccess } = require("../Core/AzureAccess");
var azure = require("azure-storage");
const AzureStorage = require("./AzureStorage");
const tableService = AzureTableAccess();

module.exports = {
  GetMacro: function (day, callback) {
    var dateTime = new Date(day);
          var howFar = dateTime.setDate(dateTime.getDate() - (14));
          var day2 = new Date(howFar).toJSON().slice(0, 10);

    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    var query2 = new azure.TableQuery().where("PartitionKey gt ?", day2);
    AzureStorage.GetDaily("Macro", tableService, query, function (macro) {
      AzureStorage.GetDaily("COT", tableService, query2, function (cot) {
        AzureStorage.GetDaily("SectorSharpe", tableService, query, function (sectorSharpe) {
      
          var masterDict = {}
          macro.forEach((item) => {
            var obj = allProperties(item)
            for (const [key, value] of Object.entries(obj != undefined ? obj : {})) {
              if("Timestamp"!=key&&"PartitionKey"!=key&&"RowKey"!=key&&".metadata"!=key&&!key.includes("vix"))
              masterDict[key] = (value);
            }
          
          })
          
         
            var obj = allProperties(cot[cot.length-1])
            for (const [key, value] of Object.entries(obj != undefined ? obj : {})) {
              if("Timestamp"!=key&&"PartitionKey"!=key&&"RowKey"!=key&&".metadata"!=key)
              masterDict[key] = (value);
            }
        
  
          sectorSharpe.forEach((item) => {
            var obj = allProperties(item)
            for (const [key, value] of Object.entries(obj != undefined ? obj : {})) {
              if("Timestamp"!=key&&"PartitionKey"!=key&&"RowKey"!=key&&".metadata"!=key)
              masterDict[key] = (value);
            }
          })
         callback(masterDict)
        })
      })
    })
   
  },
  GetEquities_Depercated_callbackHell: function (day, callback) {
    var query2 = new azure.TableQuery()
    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    AzureStorage.GetDaily("PolygonCompany", tableService, query2, function (polygonCompany) {
    AzureStorage.GetDaily("PickList5000", tableService, query, function (fundamentals) {
      AzureStorage.GetDaily("WsjTarget", tableService, query, function (wjs) {
        AzureStorage.GetDaily("Zacks", tableService, query, function (zacks) {
          AzureStorage.GetDaily("SMA20Day", tableService, query, function (twentyDay) {
            AzureStorage.GetDaily("StocksMonthlyGrowth", tableService, query, function (stocksMonthlyGrowth) {
              AzureStorage.GetDaily("SMA50Day", tableService, query, function (fiftyDay) {
                AzureStorage.GetDaily("CCI20Day", tableService, query, function (cci) {
                  AzureStorage.GetDaily("Barcharts", tableService, query, function (barcharts) {
                    AzureStorage.GetDaily("AdDaily", tableService, query, function (ad) {
                      AzureStorage.GetDaily("ShortVolume", tableService, query, function (shortVolume) {
                        AzureStorage.GetDaily("IEX", tableService, query, function (iex) {


                          var symbolsUnique = []
                          var array = []
                          var polygonCompanyDict = {}
                          polygonCompany.forEach((company) => {
                            polygonCompanyDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var twentyDayDict = {}
                          twentyDay.forEach((company) => {
                            twentyDayDict[objectValues(company.RowKey)] = allProperties(company)
                          })

                          var stocksMonthlyGrowthDict = {}
                          stocksMonthlyGrowth.forEach((company) => {
                            stocksMonthlyGrowthDict[objectValues(company.RowKey)] = allProperties(company)
                          })

                          var fundamentalsDict = {}
                          var extras = {}

                          fundamentals.forEach((company) => {
                            var scoreDict = {}
                            
                            symbolsUnique.push(objectValues(company.RowKey))
                            fundamentalsDict[objectValues(company.RowKey)] = allProperties(company)
                            scoreDict['beniesh'] = beniesh(company)
                            scoreDict['altmanScore'] = altmanScore(company)
                            scoreDict['piotroskiScore'] = piotroskiScore(company)
                            extras[objectValues(company.RowKey)] = scoreDict
                          })
                         
                          var wjsDict = {}
                          wjs.forEach((company) => {
                            wjsDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var zacksDict = {}
                          zacks.forEach((company) => {
                            zacksDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var barchartsDict = {}
                          barcharts.forEach((company) => {
                            barchartsDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var cciDict = {}
                          cci.forEach((company) => {
                            cciDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var fiftyDayDict = {}
                          fiftyDay.forEach((company) => {
                            fiftyDayDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var adDict = {}
                          ad.forEach((company) => {
                            adDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var shortVolumeDict = {}
                          shortVolume.forEach((company) => {
                            shortVolumeDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          var iexDict = {}
                          iex.forEach((company) => {
                            iexDict[objectValues(company.RowKey)] = allProperties(company)
                          })
                          symbolsUnique.forEach((company) => {
                            var masterDict = {}
                            if (fundamentalsDict[company] != undefined &&
                             shortVolumeDict[company] != undefined &&

                             adDict[company] != undefined &&
                             fiftyDayDict[company] != undefined &&
                             cciDict[company] != undefined
                             ) {
                                for (const [key, value] of Object.entries(polygonCompanyDict[company] != undefined ? polygonCompanyDict[company] : {})) {
                                  if (key == "industry" || key == "sector")
                                  masterDict[key] = (value);
                                }
                              for (const [key, value] of Object.entries(extras[company] != undefined ? extras[company] : {})) {
                                masterDict[key] = (value);
                              }
                              for (const [key, value] of Object.entries(fundamentalsDict[company] != undefined ? fundamentalsDict[company] : {})) {
                                if (key != '.metadata' && key != 'Timestamp')
                                  masterDict[key] = (value);
                              }
                              for (const [key, value] of Object.entries(stocksMonthlyGrowthDict[company] != undefined ? stocksMonthlyGrowthDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = value;
                              }
                              for (const [key, value] of Object.entries(twentyDayDict[company] != undefined ? twentyDayDict[company] : {})) {
                                if (key == "SMA" && (!isNaN(value)))
                                  masterDict["Sma20"] = Number(value);
                              }
                              for (const [key, value] of Object.entries(iexDict[company] != undefined ? iexDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(shortVolumeDict[company] != undefined ? shortVolumeDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(adDict[company] != undefined ? adDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(fiftyDayDict[company] != undefined ? fiftyDayDict[company] : {})) {
                                if (key == "SMA" && !isNaN(value))
                                  masterDict["Sma50"] = Number(value);
                              }
                              for (const [key, value] of Object.entries(cciDict[company] != undefined ? cciDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(barchartsDict[company] != undefined ? barchartsDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(zacksDict[company] != undefined ? zacksDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                              for (const [key, value] of Object.entries(wjsDict[company] != undefined ? wjsDict[company] : {})) {
                                if (!isNaN(value))
                                  masterDict[key] = Number(value);
                              }
                                
                              array.push(masterDict);
                            }


                          })

                          callback(array);
                        })
                      })
                    })
                  })
                })
              })
            })
          })
         })
        })
      })
    });

  },

GetEquities: function (day, callback) {
  const queryAll = new azure.TableQuery(); // PolygonCompany uses this in your code
  const queryDay = new azure.TableQuery().where("PartitionKey eq ?", day);

  // If you can change the API, prefer returning a Promise and using async/await instead.
  Promise.all([
    getDailyAsync("PolygonCompany", tableService, queryAll),
    getDailyAsync("PickList5000", tableService, queryDay),
    getDailyAsync("WsjTarget", tableService, queryDay),
    getDailyAsync("Zacks", tableService, queryDay),
    getDailyAsync("SMA20Day", tableService, queryDay),
    getDailyAsync("StocksMonthlyGrowth", tableService, queryDay),
    getDailyAsync("SMA50Day", tableService, queryDay),
    getDailyAsync("CCI20Day", tableService, queryDay),
    getDailyAsync("Barcharts", tableService, queryDay),
    getDailyAsync("AdDaily", tableService, queryDay),
    getDailyAsync("ShortVolume", tableService, queryDay),
    getDailyAsync("IEX", tableService, queryDay),
  ])
    .then(
      ([
        polygonCompany,
        fundamentals,
        wjs,
        zacks,
        twentyDay,
        stocksMonthlyGrowth,
        fiftyDay,
        cci,
        barcharts,
        ad,
        shortVolume,
        iex,
      ]) => {
        const symbolsUnique = [];
        const array = [];

        const polygonCompanyDict = {};
        polygonCompany.forEach((company) => {
          polygonCompanyDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const twentyDayDict = {};
        twentyDay.forEach((company) => {
          twentyDayDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const stocksMonthlyGrowthDict = {};
        stocksMonthlyGrowth.forEach((company) => {
          stocksMonthlyGrowthDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const fundamentalsDict = {};
        const extras = {};
        fundamentals.forEach((company) => {
          const symbol = objectValues(company.RowKey);
          symbolsUnique.push(symbol);

          fundamentalsDict[symbol] = allProperties(company);

          const scoreDict = {
            beniesh: beniesh(company),
            altmanScore: altmanScore(company),
            piotroskiScore: piotroskiScore(company),
          };

          extras[symbol] = scoreDict;
        });

        const wjsDict = {};
        wjs.forEach((company) => {
          wjsDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const zacksDict = {};
        zacks.forEach((company) => {
          zacksDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const barchartsDict = {};
        barcharts.forEach((company) => {
          barchartsDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const cciDict = {};
        cci.forEach((company) => {
          cciDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const fiftyDayDict = {};
        fiftyDay.forEach((company) => {
          fiftyDayDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const adDict = {};
        ad.forEach((company) => {
          adDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const shortVolumeDict = {};
        shortVolume.forEach((company) => {
          shortVolumeDict[objectValues(company.RowKey)] = allProperties(company);
        });

        const iexDict = {};
        iex.forEach((company) => {
          iexDict[objectValues(company.RowKey)] = allProperties(company);
        });

        symbolsUnique.forEach((symbol) => {
          const masterDict = {};

          if (
            fundamentalsDict[symbol] !== undefined &&
            shortVolumeDict[symbol] !== undefined &&
            adDict[symbol] !== undefined &&
            fiftyDayDict[symbol] !== undefined &&
            cciDict[symbol] !== undefined
          ) {
            // Polygon (industry/sector only)
            const poly = polygonCompanyDict[symbol] || {};
            for (const [key, value] of Object.entries(poly)) {
              if (key === "industry" || key === "sector") masterDict[key] = value;
            }

            // Extra scores
            const extra = extras[symbol] || {};
            for (const [key, value] of Object.entries(extra)) masterDict[key] = value;

            // Fundamentals (skip metadata)
            const fund = fundamentalsDict[symbol] || {};
            for (const [key, value] of Object.entries(fund)) {
              if (key !== ".metadata" && key !== "Timestamp") masterDict[key] = value;
            }

            // Monthly growth numeric
            const mg = stocksMonthlyGrowthDict[symbol] || {};
            for (const [key, value] of Object.entries(mg)) {
              if (!isNaN(value)) masterDict[key] = value;
            }

            // SMA20
            const d20 = twentyDayDict[symbol] || {};
            for (const [key, value] of Object.entries(d20)) {
              if (key === "SMA" && !isNaN(value)) masterDict["Sma20"] = Number(value);
            }

            // IEX numeric
            const iexRow = iexDict[symbol] || {};
            for (const [key, value] of Object.entries(iexRow)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // Short volume numeric
            const sv = shortVolumeDict[symbol] || {};
            for (const [key, value] of Object.entries(sv)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // AD numeric
            const adRow = adDict[symbol] || {};
            for (const [key, value] of Object.entries(adRow)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // SMA50
            const d50 = fiftyDayDict[symbol] || {};
            for (const [key, value] of Object.entries(d50)) {
              if (key === "SMA" && !isNaN(value)) masterDict["Sma50"] = Number(value);
            }

            // CCI numeric
            const cciRow = cciDict[symbol] || {};
            for (const [key, value] of Object.entries(cciRow)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // Barcharts numeric
            const bc = barchartsDict[symbol] || {};
            for (const [key, value] of Object.entries(bc)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // Zacks numeric
            const zk = zacksDict[symbol] || {};
            for (const [key, value] of Object.entries(zk)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            // WSJ numeric
            const wsjRow = wjsDict[symbol] || {};
            for (const [key, value] of Object.entries(wsjRow)) {
              if (!isNaN(value)) masterDict[key] = Number(value);
            }

            array.push(masterDict);
          }
        });

        callback(array);
      }
    )
    .catch((err) => {
      // Preserve your callback API; decide how you want to surface errors.
      // Option A: callback([]) (silent fail)
      // Option B: callback(null, err) (requires changing callback signature)
      // Option C: throw (will crash if not handled)
      console.error("GetEquities failed:", err);
      callback([]);
    });
},

  GetNullShort: function (day, callback) {
    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    AzureStorage.GetDaily("PickList5000", tableService, query, function (obj) {
      var array = [];
      obj.forEach((company) => {
        var equity = allProperties(company)
        if (!isNaN(beniesh(company))) {
          array.push({
            symbol: objectValues(company.RowKey),
            score: countNull(company),
            beniesh: beniesh(company),
            equity: equity
          });
        }

      });
      callback(array);
    });
  },
  GetMonster: function (day, callback) {
    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    AzureStorage.GetDaily("PickList5000", tableService, query, function (obj) {
      GetShortVolume(day, function (data) {
        var sum = 0;
        var dict = [];
        data.forEach((x) => {
          dict[x.symbol] = x.shortScore;
          sum += x.shortScore;
        });
        var monster = [];
        obj.forEach((company) => {
          if (!isNaN(Net_IncomeDelta(company))) {
            monster.push({
              altman: altmanScore(company),
              symbol: objectValues(company.RowKey),
              netDelta: Net_IncomeDelta(company),
              peDelta: isNaN(peDeltaScore(company)) ? 0 : peDeltaScore(company),
              shortV: isNaN(dict[objectValues(company.RowKey)])
                ? 0
                : dict[objectValues(company.RowKey)],
            });
          }
        });
        callback(monster);
      });
    });
  },

  GetDelta: function (day, callback) {
    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    AzureStorage.GetDaily("PickList5000", tableService, query, function (obj) {
      var turnover = [];
      obj.forEach(function (company) {
        turnover.push({
          symbol: objectValues(company.RowKey),
          score: topDeltas(company),
          zScore: altmanScore(company),
        });
      });
      callback(turnover);
    });
  },
  ta: function (day, callback) {
    console.log("ta lookback: " + day);
    var query = new azure.TableQuery().where("PartitionKey eq ?", day);
    AzureStorage.GetDaily(
      "ShortVolume",
      tableService,
      query,
      function (shortVolume) {
        AzureStorage.GetDaily(
          "BBandsDaily",
          tableService,
          query,
          function (bbandsDaily) {
            AzureStorage.GetDaily(
              "ADDaily",
              tableService,
              query,
              function (addaily) {
                AzureStorage.GetDaily(
                  "CCI20Day",
                  tableService,
                  query,
                  function (cci20) {
                    var addailydic = {};
                    var cci = {};

                    var array = [];
                    addaily.forEach((company) => {
                      addailydic[objectValues(company.RowKey)] =
                        addVol(company);

                      array.push(objectValues(company.RowKey));
                    });
                    cci20.forEach((company) => {
                      cci[objectValues(company.RowKey)] = cci20day(company);
                      array.push(objectValues(company.RowKey));
                    });
                    var shortVolSort = [];
                    var bbandSort = [];
                    var shortvolDict = {};
                    shortVolume.forEach((company) => {
                      shortVolSort.push({
                        symbol: objectValues(company.RowKey),
                        growthDiff: shortV(company).growthDiff,
                        isShortBull: shortV(company).isShortBull,
                      });
                      shortvolDict[objectValues(company.RowKey)] =
                        shortV(company).growthDiff;
                      array.push(objectValues(company.RowKey));
                    });

                    bbandsDaily.forEach((company) => {
                      bbandSort.push({
                        symbol: objectValues(company.RowKey),
                        score: bbandvol(company),
                      });
                      array.push(objectValues(company.RowKey));
                    });
                    var keeplong = [];
                    var keepshort = [];
                    var shortInterestGrowthSorted = shortVolSort.sort(function (
                      a,
                      b
                    ) {
                      return b.growthDiff - a.growthDiff;
                    });
                    var bbandVolSorted = bbandSort.sort(function (a, b) {
                      return a.score - b.score;
                    });

                    var top = bbandVolSorted.slice(
                      0,
                      Math.round(bbandSort.length * 0.3)
                    );
                    var bottom = shortInterestGrowthSorted.slice(
                      Math.round(shortVolSort.length * 0.8),
                      shortVolSort.length
                    );
                    var winners = [];
                    var losers = [];
                    top.forEach((x) => {
                      if (true) {
                        winners.push(x.symbol);
                      }
                    });
                    bottom.forEach((x) => {
                      if (x.isShortBull == true) {
                        losers.push(x.symbol);
                      }
                    });

                    var distinct = array.sort().filter(onlyUnique);
                    distinct.forEach((symbol) => {
                      if (
                        // winners.includes(symbol)&&
                        !losers.includes(symbol) &&
                        shortvolDict[symbol] < 0
                      ) {
                        keeplong.push({
                          symbol: symbol,
                          score: Math.abs(addailydic[symbol]), //
                        });
                      }
                      if (
                        losers.includes(symbol) &&
                        cci[symbol] < 0 &&
                        addailydic[symbol] < 0
                      ) {
                        keepshort.push({
                          symbol: symbol,
                          score: addailydic[symbol] * cci[symbol],
                        });
                      }
                    });

                    callback(keeplong, keepshort);
                  }
                );
              }
            );
          }
        );
      }
    );
  },
};

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}
function topDeltas(company) {
  var peDelta = Number(
    objectValues(company.P_E_ratio) / objectValues(company.P_E_ratio_LastYear)
  );
  var assetTurnoverDelta = Number(
    objectValues(company.Asset_Turnover) /
    objectValues(company.Asset_Turnover_LastYear)
  );
  var financingDelta = Number(
    objectValues(company.Financing_cash_flow) /
    objectValues(company.Financing_cash_flow_LastYear)
  );
  var evDelta = Number(
    objectValues(company.Enterprise_Value) /
    objectValues(company.Enterprise_Value_LastYear)
  );
  //  var revenueDelta =   Number(objectValues(company.Revenue) / objectValues(company.Revenue_LastYear))
  var marketCapDelta = Number(
    objectValues(company.Market_Cap) / objectValues(company.Market_Cap_LastYear)
  );
  var saleDelta = Number(
    (objectValues(company.EV_Sales) * objectValues(company.Enterprise_Value)) /
    (objectValues(company.EV_Sales_LastYear) *
      objectValues(company.Enterprise_Value_LastYear))
  );

  var deltas =
    Number(isNaN(marketCapDelta) ? 0 : marketCapDelta) -
    Number(isNaN(financingDelta) ? 0 : financingDelta);

  return deltas;
}
// Promise wrapper around your callback-style AzureStorage.GetDaily
function getDailyAsync(tableName, tableService, query) {
  return new Promise((resolve, reject) => {
    AzureStorage.GetDaily(tableName, tableService, query, (result) => {
      // If your GetDaily has an error-first callback signature, change to (err, result)
      // and reject(err) accordingly.
      try {
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  });
}


function objectValues(metric) {
  var result =
    (Object.values(metric != undefined && metric != null ? metric : {})[0] ==
      "Edm.Double") |
      (Object.values(metric != undefined && metric != null ? metric : {})[0] ==
        "Edm.String")
      ? Object.values(metric != undefined && metric != null ? metric : {})[1]
      : Object.values(metric != undefined && metric != null ? metric : {})[0];
  return result;
}

function bbandvol(company) {
  var lower = Number(objectValues(company.Real_Lower_Band));
  var upper = Number(objectValues(company.Real_Upper_Band));
  var middle = Number(objectValues(company.Real_Middle_Band));

  var abs = (upper - middle + middle - lower) / 2 / middle;
  return abs;
}

function beniesh(company) {

  company = allProperties(company)

  var Revenue = company['Revenue']
  var Receivables = company['Receivables']
  var SGA_Expenses = company['SGA_Expenses']
  var Cost_of_Revenue = company['Cost_of_Revenue']
  var Depreciation__Amortization = company['Depreciation__Amortization']
  var Income_from_Continuous_Operations = company['Income_from_Continuous_Operations']
  var Total_current_assets = company['Total_current_assets']
  var Property_Plant_Equpment_Net = company['Property_Plant_Equpment_Net']
  var Total_Assets = company['Total_Assets']
  var Total_liabilities = company['Total_liabilities']
  var Total_Debt = company['Total_Debt']
  var Operating_Cash_Flow = company['Operating_Cash_Flow']

  var Revenue_LastYear = company['Revenue_LastYear']
  var Receivables_LastYear = company['Receivables_LastYear']
  var SGA_Expenses_LastYear = company['SGA_Expenses_LastYear']
  var Cost_of_Revenue_LastYear = company['Cost_of_Revenue_LastYear']
  var Depreciation__Amortization_LastYear = company['Depreciation__Amortization_LastYear']
  var Income_from_Continuous_Operations_LastYear = company['Income_from_Continuous_Operations_LastYear']
  var Total_current_assets_LastYear = company['Total_current_assets_LastYear']
  var Property_Plant_Equpment_Net_LastYear = company['Property_Plant_Equpment_Net_LastYear']
  var Total_Assets_LastYear = company['Total_Assets_LastYear']
  var Total_liabilities_LastYear = company['Total_liabilities_LastYear']
  var Total_Debt_LastYear = company['Total_Debt_LastYear']
  var Operating_Cash_Flow_LastYear = company['Operating_Cash_Flow_LastYear']

  var dsri = Receivables / Revenue * 365
  var dsri_LastYear = Receivables_LastYear / Revenue_LastYear * 365
  var dsriIndex = dsri / dsri_LastYear

  var gmi = (Revenue - Cost_of_Revenue) / Revenue
  var gmi_LastYear = (Revenue_LastYear - Cost_of_Revenue_LastYear) / Revenue_LastYear
  var gmiIndex = gmi / gmi_LastYear

  var aqi = (1 - (Total_current_assets + Property_Plant_Equpment_Net)) / Total_Assets
  var aqi_LastYear = (1 - (Total_current_assets_LastYear + Property_Plant_Equpment_Net_LastYear)) / Total_Assets_LastYear
  var aqiIndex = aqi / aqi_LastYear

  var sgi = Revenue
  var sgi_LastYear = Revenue_LastYear
  var sgiIndex = sgi / sgi_LastYear

  var depi = Depreciation__Amortization / (Property_Plant_Equpment_Net + Depreciation__Amortization)
  var depi_LastYear = Depreciation__Amortization_LastYear / (Property_Plant_Equpment_Net_LastYear + Depreciation__Amortization_LastYear)
  var depiIndex = depi / depi_LastYear

  var sgai = SGA_Expenses / Revenue
  var sgai_LastYear = SGA_Expenses_LastYear / Revenue_LastYear
  var sgaiIndex = sgai / sgai_LastYear

  var lvgi = (Total_liabilities + Total_Debt) / Total_Assets
  var lvgi_LastYear = (Total_liabilities_LastYear + Total_Debt_LastYear) / Total_Assets_LastYear
  var lvgiIndex = lvgi / lvgi_LastYear

  var tata = (Income_from_Continuous_Operations - Operating_Cash_Flow) / Total_Assets
  var tata_LastYear = (Income_from_Continuous_Operations_LastYear - Operating_Cash_Flow_LastYear) / Total_Assets_LastYear
  var tataIndex = tata / tata_LastYear

  // console.log({
  //   Property_Plant_Equpment_Net_LastYear:Property_Plant_Equpment_Net_LastYear,
  //   Total_Assets:Total_Assets,
  //   dsri:dsri,
  //   dsri_LastYear:dsri_LastYear,
  //   gmi:gmi,
  //   gmi_LastYear:gmi_LastYear,
  //   aqi:aqi,
  //   aqi_LastYear:aqi_LastYear,
  //   sgi:sgi,
  //   sgi_LastYear:sgi_LastYear,
  //   depi:depi,
  //   depi_LastYear:depi_LastYear,
  //   sgai:sgai,
  //   sgai_LastYear:sgai_LastYear,
  //   lvgi:lvgi,
  //   lvgi_LastYear:lvgi_LastYear,
  //   tata:tata,
  //   tata_LastYear:tata_LastYear

  // })
  //=−4.84 + 0.92 × DSRI + 0.528 × GMI + 0.404 × AQI + 0.892 × SGI + 0.115 × DEPI −0.172 × SGAI + 4.679 × TATA − 0.327 × LVGI
  return -4.84 + 0.92 * dsriIndex + 0.528 * gmiIndex + 0.404 * aqiIndex + 0.892 * sgiIndex + 0.115 * depiIndex - 0.172 * sgaiIndex + 4.679 * tataIndex - 0.327 * lvgiIndex
}

function allProperties(company) {
  var obj = {}
  for (const property in company) {
    obj[property] = objectValues(company[property]);
  }
  return obj;
}
function countNull(company) {
  var sum = 0
  for (const property in company) {
    if (!isNaN(objectValues(company[property]))) {
      sum += objectValues(company[property])
    }
  }
  return sum;
}
function peDeltaScore(company) {
  var result =
    (objectValues(company.P_E_ratio) -
      objectValues(company.P_E_ratio_LastYear)) /
    objectValues(company.P_E_ratio_LastYear);
  return result;
}
function piotroskiScore(company) {
  var PositiveNetIncome = objectValues(company.Net_Income) > 0 ? 1 : 0;
  var PositiveReturnOnAssets =
    objectValues(company.Net_Income) / objectValues(company.Total_Assets) > 0
      ? 1
      : 0;
  var PositiveOperatingCashFlow =
    objectValues(company.Operating_Cash_Flow) > 0 ? 1 : 0;
  var CashFlowGreaterThanNetIncome =
    objectValues(company.Operating_Cash_Flow) >
      objectValues(company.Net_Income) >
      0
      ? 1
      : 0;
  var LoweredRatioOfLongTermDebt =
    objectValues(company.Long_Term_Debt_Total) <
      objectValues(company.Long_Term_Debt_Total_LastYear)
      ? 1
      : 0;
  var HigherCurrentRatio =
    objectValues(company.Total_current_assets) >
      objectValues(company.Total_current_assets)
      ? 1
      : 0;
  var HigherGrossMargin =
    objectValues(company.Gross_Margin) >
      objectValues(company.Gross_Margin_LastYear)
      ? 1
      : 0;
  var HigherAssetTurnover =
    objectValues(company.Asset_Turnover) >
      objectValues(company.Asset_Turnover_lastYear)
      ? 1
      : 0;
  var piotroski =
    HigherAssetTurnover +
    HigherGrossMargin +
    HigherCurrentRatio +
    LoweredRatioOfLongTermDebt +
    CashFlowGreaterThanNetIncome +
    PositiveOperatingCashFlow +
    PositiveReturnOnAssets +
    PositiveNetIncome;
  // console.log({HigherAssetTurnover:HigherAssetTurnover,
  //   HigherGrossMargin:HigherGrossMargin ,
  //   HigherCurrentRatio:HigherCurrentRatio ,
  //   LoweredRatioOfLongTermDebt:LoweredRatioOfLongTermDebt ,
  //   CashFlowGreaterThanNetIncome:CashFlowGreaterThanNetIncome ,
  //   PositiveOperatingCashFlow:PositiveOperatingCashFlow ,
  //   PositiveReturnOnAssets:PositiveReturnOnAssets ,
  //   PositiveNetIncome:PositiveNetIncome})
  return piotroski;
}
function altmanScore(company) {
  var A = Number(
    objectValues(company.Total_current_assets_LastYear) /
    objectValues(company.Total_current_liabilities_LastYear) /
    objectValues(company.Total_Assets_LastYear)
  ).toFixed(2);
  var B = Number(
    objectValues(company.Retained_Earnings_LastYear) /
    objectValues(company.Total_Assets_LastYear)
  ).toFixed(2);
  var C = Number(
    objectValues(company.EBIT_LastYear) / objectValues(company.Total_Assets)
  ).toFixed(2);
  var D = Number(
    objectValues(company.Market_Cap_LastYear) /
    objectValues(company.Total_liabilities_LastYear)
  ).toFixed(2);
  var E = Number(
    (objectValues(company.EV_Sales_LastYear) *
      objectValues(company.EV_EBIT_LastYear) *
      objectValues(company.EBIT_LastYear)) /
    objectValues(company.Total_Assets)
  ).toFixed(2);
  // console.log({A:A,B:B,C:C,D:D,E:E})
  var ZScore = Number(1.2 * A + 1.4 * B + 3.3 * C + 0.6 * D + 1.0 * E).toFixed(
    2
  );

  return Number(ZScore);
}
function shortV(company) {
  var growthDiff = Number(objectValues(company.growthDiff));
  var shortDay = Number(objectValues(company.shortDay));
  var shortWeekAvg = Number(objectValues(company.shortWeekAvg));
  var isShortBull = shortDay > shortWeekAvg;
  return { growthDiff: growthDiff, isShortBull: isShortBull };
}
function cci20day(company) {
  var CCI = Number(objectValues(company.CCI));

  return CCI;
}
function addVol(company) {
  return Number(objectValues(company.AD_Line));
}



function Net_IncomeDelta(company) {
  var Net_IncomeDelta =
    (objectValues(company.Net_Income) -
      objectValues(company.Net_Income_LastYear)) /
    objectValues(company.Net_Income_LastYear);
  return Net_IncomeDelta;
}



function GetShortVolume(day, callback) {
  var list = [];
  var filter = {};
  var query = new azure.TableQuery().where("PartitionKey eq ?", day);
  AzureStorage.GetTable(
    "ShortVolume",
    tableService,
    query,
    function (shortVolume) {
      shortVolume.forEach(function (item) {
        {
          list.push({
            symbol: objectValues(item.RowKey),
            shortScore: Math.abs(objectValues(item.growthDiff)),
          });
        }
      });
      callback(list);
    }
  );
}
