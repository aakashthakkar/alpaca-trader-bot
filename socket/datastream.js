const Alpaca = require("@alpacahq/alpaca-trade-api");
const DailyPurchaseClass = require("../trading/dailyPurchaseBot");
const schedule = require('node-schedule');
const { STOCK_LIST, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY } = require("../utils/tradeValues");

class DataStream {
    constructor({ apiKey, secretKey, feed, paper = true }) {
        this.alpaca = new Alpaca({
            keyId: apiKey,
            secretKey,
            feed,
            paper
        });
        this.lastKnownStatus= null;

        //initialization of all stock objects
        STOCK_LIST.forEach((stockTicker) => {
            this[stockTicker] = new DailyPurchaseClass(this.alpaca, stockTicker, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY);
        });

        const socket = this.alpaca.data_stream_v2;
        DailyPurchaseClass.initializeCommonSchedules();

        socket.onConnect(function () {
            console.log(`${new Date().toLocaleString()} :: Socket connected`);
            socket.subscribeForQuotes(STOCK_LIST);
        });

        socket.onError((err) => {
            console.log(`${new Date().toLocaleString()} :: ERR: ${err.toString()}`);
        });

        socket.onStockTrade((trade) => {
            console.log(`${new Date().toLocaleString()} :: TRADE: ${JSON.stringify(trade)}`);
        });

        socket.onStockQuote(async (quote) => {
            await this[quote.Symbol].handleQuoteChangeForPurchase(quote);
        });

        socket.onStockBar((bar) => {
            console.log(`${new Date().toLocaleString()} :: BAR: ${JSON.stringify(bar)}`);
        });

        socket.onStatuses((s) => {
            console.log(`${new Date().toLocaleString()} :: STATUS: ${JSON.stringify(s)}`);
            this.lastKnownStatus = s;
        });

        socket.onStateChange((state) => {
            console.log(`${new Date().toLocaleString()} :: STATE CHANGED: ${JSON.stringify(state)}`);
        });

        socket.onDisconnect(() => {
            console.log(`${new Date().toLocaleString()} :: Socket disconnected`);
        });


        socket.connect();
        this.scheduleDailyReconnect(socket);
        this.scheduleDailyDisconnect(socket);
    }

    scheduleDailyReconnect(socket) {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 7;
        rule.minute = 58;
        rule.tz = 'America/New_York';

        schedule.scheduleJob(rule, () => {
            if(this.lastKnownStatus === "connected" || this.lastKnownStatus === "authenticated") {
                console.log(`${new Date().toLocaleString()} :: Socket already connected, skipping reconnect`);
                return;
            }
            socket.connect();
        });
    }

    scheduleDailyDisconnect(socket) {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 16;
        rule.minute = 1;
        rule.tz = 'America/New_York';

        schedule.scheduleJob(rule, () => {
            socket.disconnect();
        });
    }
}

module.exports = DataStream;