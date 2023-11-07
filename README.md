# alpaca-trader-bot
Alpaca trading bot learning project <br />
Use it at your own risk!

A basic trading bot which buys 10 dollars worth of VOO ETF Everyday.<br />
It adds 10 dollars more if the current market price is less than the average price of VOO purchased.<br />
It adds 10 dollars more if the current market price is less than the average price of last 20 orders of VOO purchased. (Disabled by default. Enable manually)<br />
It adds 10 dollars more if the current market price is less than the average price of last 100 orders of VOO purchased. (Disabled by default. Enable manually)<br />


How to setup:<br />

It needs 3 Environment variables<br />
API_KEY : string # API key from alpaca<br />
SECRET_KEY : string # Secret key from alpaca<br />
IS_PAPER: string boolean # flag that decides if the API is paper API (fake money) or live API (real money)<br />



