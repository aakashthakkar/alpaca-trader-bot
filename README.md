# Daily stock purchase bot using Alpaca JS API
Alpaca trading bot learning project <br />
<b>Use it at your own risk!</b>

# What it does?
- A basic trading bot which buys 10 dollars worth of <b>VOO</b> ETF Everyday.<br />
- It adds 10 dollars more if the current market price is less than the average price of VOO purchased.<br />
- It adds 10 dollars more if the current market price is less than the average price of last 20 orders of VOO purchased. (Disabled by default. Enable manually)<br />
- It adds 10 dollars more if the current market price is less than the average price of last 100 orders of VOO purchased. (Disabled by default. Enable manually)<br />

# How to setup?

It needs 3 Environment variables
- API_KEY : string (Required)# API key from alpaca
- SECRET_KEY : string (Required)# Secret key from alpaca
- IS_PAPER: string boolean (Optional: default true)# flag that decides if the API is paper API (fake money) or live API (real money) 
- STOCK_LIST: comma separated string (Optional: default "VOO") # example usage "VOO,AAPL"
- DAILY_ENABLED_TRADES: comma separated string (Optional: default "DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE") # supported values DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE,PRICE_LOWER_THAN_LAST_20,PRICE_LOWER_THAN_LAST_<X> 

# Running Locally
- Uses Node 18
- Setup environment variables
- npm i && npm start

# Docker
Get it from <a href="https://hub.docker.com/repository/docker/thakkaraakash/alpaca-trader-bot/general">docker hub</a> and run it with the above ENV variables.
