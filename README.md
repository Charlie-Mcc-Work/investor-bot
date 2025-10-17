# Stock Trading Discord Bot

A Discord bot that allows users to trade real-world stocks with virtual money. Users start with $1000 and can buy, sell, and short stocks using real market data.

## Features

- 🏦 **Virtual Trading**: Start with $1000 virtual cash
- 📈 **Real Stock Data**: Uses Alpha Vantage API for live stock prices
- 💰 **Buy & Sell**: Purchase and sell stocks at current market prices
- 🩳 **Short Selling**: Short stocks and profit from price declines
- 📊 **Portfolio Tracking**: View your holdings and profit/loss
- 🏆 **Leaderboard**: Compete with others based on total portfolio value
- 📜 **Transaction History**: Track all your trades
- 🔍 **Stock Search**: Find stock symbols by company name
- 📊 **Market Overview**: View popular stocks and their prices

## Commands

- `/buy <symbol> <quantity>` - Buy shares of a stock
- `/sell <symbol> <quantity>` - Sell shares you own
- `/short <symbol> <quantity>` - Short sell a stock
- `/cover <symbol> <quantity>` - Cover a short position
- `/price <symbol>` - Get current stock price
- `/portfolio` - View your stock holdings
- `/balance` - Check cash and total portfolio value
- `/leaderboard` - See top traders by portfolio value
- `/history` - View recent trading history
- `/market` - Show popular stocks and prices
- `/search <query>` - Search for stock symbols

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Get API keys:
   - Discord Bot Token from [Discord Developer Portal](https://discord.com/developers/applications)
   - Alpha Vantage API Key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (free)

3. Update `config.json`:
   ```json
   {
       "token": "YOUR_DISCORD_BOT_TOKEN",
       "alpha_vantage_api_key": "YOUR_ALPHA_VANTAGE_API_KEY"
   }
   ```

4. Start the bot:
   ```bash
   npm start
   ```

## How It Works

- **Starting Balance**: Every user begins with $1000 in virtual cash
- **Real Prices**: Stock prices are fetched from Alpha Vantage API
- **Portfolio Value**: Your total worth = cash + stock values + short position values
- **Short Selling**: Borrow and sell stocks, profit when price drops
- **Leaderboard**: Rankings based on total portfolio value
- **Price Caching**: Stock prices cached for 5 minutes to reduce API calls

## Popular Stocks Available

The bot includes 50+ popular stocks including:
AAPL, MSFT, GOOGL, AMZN, TSLA, META, NVDA, NFLX, and many more!

## Example Usage

```
/buy AAPL 10          # Buy 10 shares of Apple
/price TSLA           # Check Tesla's current price  
/sell AAPL 5          # Sell 5 shares of Apple
/short TSLA 2         # Short 2 shares of Tesla
/cover TSLA 2         # Cover the Tesla short position
/portfolio            # View all your holdings
/balance              # Check total portfolio value
/leaderboard          # See who's winning!
```

## Development

The bot uses:
- **discord.js** for Discord integration
- **sqlite3** for local database storage
- **axios** for API requests
- **Alpha Vantage API** for stock data

Database tables:
- `users` - User accounts and cash balances
- `holdings` - Stock positions (long and short)
- `transactions` - Trading history
- `stock_cache` - Cached stock prices
