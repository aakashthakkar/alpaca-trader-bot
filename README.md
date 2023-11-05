# alpaca-trading-bot
Alpaca trading bot learning project
Use it at your own risk!

A basic trading bot which buys 10 dollars worth of VOO ETF Everyday.
It adds 10 dollars more if the current market price is less than the average price of VOO purchased.
It adds 10 dollars more if the current market price is less than the average price of last 20 orders of VOO purchased. (Disabled by default. Enable manually)
It adds 10 dollars more if the current market price is less than the average price of last 100 orders of VOO purchased. (Disabled by default. Enable manually)


How to setup:

It needs 3 Environment variables
API_KEY : string # API key from alpaca
SECRET_KEY : string # Secret key from alpaca
IS_PAPER: string boolean # flag that decides if the API is paper API (fake money) or live API (real money)



