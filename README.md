# Backtester

Quantitative algorithmic equity portfolio modeling — R&D, simulation, backtesting, and live trading deployment using Node.js.

Part of the [SimTrade](https://github.com/SimTrade) organization. Depends on market data provided by the [Ingest](https://github.com/SimTrade/Ingest) pipeline stored in Azure Table Storage.

## What It Does

- Write a trading algorithm as a model file with a `.run()` method
- Simulate a trade history against historical market data
- Backtest that simulation for performance analytics (returns, Sharpe, Sortino, max drawdown, gain-to-pain)
- Deploy the same model to execute live trades via the Alpaca brokerage API
- Each backtest run is versioned and saved as a CSV for iteration and comparison

## Usage

```bash
# Backtest a model over the last N trading days
node process.js backtest <days> <ModelName>

# Live trade using today's signals
node process.js trade 0 <ModelName>

# Preview/prepare trade signals without executing
node process.js prep 0 <ModelName>
```

**Example:**
```bash
node process.js backtest 2500 MyAlgo
node process.js trade 0 MyAlgo
```

> Azure SAS token and Alpaca API keys are required in `./Library/Secrets/`.

## Models

Create your algorithm in `./Library/Models/<ModelName>.js`. It must export a `.run()` method conforming to the SimTrade coding standard.

**Example model:** `./Library/Models/MyAlgo.js`

## Output

On first backtest run, the model is versioned and output is saved:

```
./Output/MyAlgo/
    MyAlgo_1.js              ← versioned copy of model
    MyAlgo_1_sim.csv         ← simulation trade history
    MyAlgo_1_backtest.csv    ← performance analytics per day
```

The version number increments on each run (`MyAlgo_1`, `MyAlgo_2`, etc.).

## Directory Structure

```
process.js               ← entry point
Core/
    BacktestRunner.js    ← performance calculation engine
    SimulationBuilder.js
    lookback.js / lookbacker.js
    writecsvRowBacktest.js
    writecsvRowSimulation.js
Library/
    RunAlgo.js           ← loads and routes model by name
    ModelRunner.js
    Order.js             ← calendar checks, order management
    alpacaTrader.js      ← Alpaca live trading integration
    alpacaReplaceOrder.js
    alpacaTradable.js
    AzureStorage.js      ← reads market data from Azure
    Builder.js
    testortrade.js
    Models/
        MyAlgo.js        ← example algorithm
```

## Requirements

- Node.js
- Azure Table Storage SAS token (for market data via [Ingest](https://github.com/SimTrade/Ingest))
- Alpaca API keys (for live trading)
