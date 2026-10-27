# Crypto Trading Dashboard

A React + TypeScript dashboard to **track**, **study** and **predict** cryptocurrencies.

## Features

- **Track**: an editable watchlist (search any coin on CoinGecko), live prices refreshed every 60 s, 1h/24h/7d change, market cap, volume and 7-day sparklines.
- **Charts**: 24H / 7D / 30D / 90D / 1Y price history with SMA 20, SMA 50, EMA 20 and Bollinger Band overlays, plus Volume, RSI and MACD panels.
- **Study**: period return, annualised volatility, Sharpe ratio, max drawdown, support and resistance, a technical-signal summary (RSI, MACD, moving-average cross, Bollinger %B) and a return-correlation matrix for the watchlist.
- **Predict**: a linear trend, Holt's damped exponential smoothing, AR(5) on log returns, or an ensemble of all three. It shows the predicted price, a 95% range and the chance of ending higher. A walk-forward backtest compares the model with a "price stays the same" baseline.
- **Paper trading**: practise buying and selling with $10,000 of virtual cash. The portfolio is saved in the browser.

Market data comes from the free [CoinGecko API](https://www.coingecko.com/en/api), which needs no key. If the API can't be reached or is rate limited, the app switches to simulated data and shows a **Demo data** badge.

> Forecasts are statistical extrapolations for study purposes only. They are not financial advice.

## Run

```bash
npm install
npm run dev      # development server
npm run build    # production build in dist/
npm start        # run the built app in Electron
```
