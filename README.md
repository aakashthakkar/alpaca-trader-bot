# Daily Stock Purchase Bot using Alpaca JS API

This project is a learning exercise to create a basic trading bot using the Alpaca API. **Use it at your own risk!**

## Features
- Automatically buys $10 worth of the **VOO** ETF every day.
- Additional purchases of $10 are triggered if:
  - The current market price is lower than the average purchase price of VOO.
  - The current market price is lower than the average price of the last 20 orders of VOO (disabled by default).
  - The current market price is lower than the average price of the last 100 orders of VOO (disabled by default).
- Supports multiple stocks and custom purchase scenarios.

## Setup Instructions

### Environment Variables
To configure the bot, set the following environment variables:

| Variable Name         | Type    | Required | Default Value | Description                                                                 |
|-----------------------|---------|----------|---------------|-----------------------------------------------------------------------------|
| `API_KEY`             | string  | Yes      | None          | Your Alpaca API key.                                                       |
| `SECRET_KEY`          | string  | Yes      | None          | Your Alpaca secret key.                                                    |
| `IS_PAPER`            | boolean | No       | `true`        | Set to `true` for paper trading (fake money) or `false` for live trading.  |
| `STOCK_LIST`          | string  | No       | `VOO`         | Comma-separated list of stock tickers to trade (e.g., `VOO,AAPL`).         |
| `DAILY_ENABLED_TRADES`| string  | No       | `DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE` | Comma-separated list of trade scenarios to enable. |

### Supported Trade Scenarios
- `DAILY_PURCHASE`: Buys $10 worth of stock daily.
- `PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE`: Buys $10 if the current price is lower than the average purchase price.
- `PRICE_LOWER_THAN_LAST_20`: Buys $10 if the current price is lower than the average price of the last 20 orders.
- `PRICE_LOWER_THAN_LAST_{x}`: Replace `{x}` with a number to enable custom scenarios.

### Running Locally
1. Install [Node.js](https://nodejs.org/) (version 18 or higher).
2. Clone the repository:
   ```bash
   git clone https://github.com/aakashthakkar/alpaca-trading-bot.git
   cd alpaca-trading-bot
   ```
3. Set up environment variables in a `.env` file or export them in your terminal.
4. Install dependencies and start the bot:
   ```bash
   npm install
   npm start
   ```

### Running with Docker
1. Pull the Docker image:
   ```bash
   docker pull thakkaraakash/alpaca-trader-bot
   ```
2. Run the container with the required environment variables:
   ```bash
   docker run -e API_KEY=your_api_key -e SECRET_KEY=your_secret_key -e IS_PAPER=true thakkaraakash/alpaca-trader-bot
   ```

## Troubleshooting
- **Issue**: Bot does not place orders.
  - **Solution**: Ensure your API key and secret key are correct and have the necessary permissions.
- **Issue**: Environment variables are not recognized.
  - **Solution**: Double-check the `.env` file or exported variables.

## License
This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
