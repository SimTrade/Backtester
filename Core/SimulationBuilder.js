/////////////////////////////////////////////////// DEPENDENCIES //////////////////////////////////////////////////////////////
"use strict";
const { lookback } = require("../Core/lookback");

function SimulationBuilder(file, indexAdder, incrementer, method, back) {
 
  console.log("_________" + file + "_____________");
  for (var i = 0; i <= indexAdder; i++) {
    (function (i) {
      setTimeout(
        function () {
          console.log("");
          console.log("");
          console.log("");
          console.log("____________| Daysback: " + i);
          var dateTime = new Date();
          var howFar = dateTime.setDate(dateTime.getDate() - i);
          var day = new Date(howFar).toJSON().slice(0, 10);
          lookback(day, file, method, false, back);
        },
        indexAdder == i ? 1 : (indexAdder - i) * incrementer
      );
    })(i);
  }
}
exports.SimulationBuilder = SimulationBuilder;
