const Alpaca = require("@alpacahq/alpaca-trade-api");
const DailyPurchaseClass = require("../trading/dailyPurchaseBot");
const schedule = require('node-schedule');
const { STOCK_LIST, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY } = require("../utils/tradeValues");

/**
 * Class to manage the Alpaca data stream and initialize stock trading bots.
 */
class DataStream {
    /**
     * Constructor to initialize the DataStream class.
     * @param {Object} config - Configuration object containing API keys and feed settings.
     */
    constructor({ apiKey, secretKey, feed, paper = true }) {
        // Initialize Alpaca API client
        this.alpaca = new Alpaca({
            keyId: apiKey,
            secretKey,
            feed,
            paper
        });
        this.lastKnownStatus = null; // Tracks the last known connection status

        // Initialize trading bots for each stock in the list
        STOCK_LIST.forEach((stockTicker) => {
            this[stockTicker] = new DailyPurchaseClass(this.alpaca, stockTicker, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY);
        });

        const socket = this.alpaca.data_stream_v2; // Alpaca data stream instance
        DailyPurchaseClass.initializeCommonSchedules(); // Initialize common schedules

        // Set up socket event handlers
        socket.onConnect(function () {
            console.log(`${new Date().toLocaleString()} :: Socket connected`);
            socket.subscribeForQuotes(STOCK_LIST); // Subscribe to stock quotes
        });

        socket.onError((err) => {
            console.log(`${new Date().toLocaleString()} :: ERR: ${err.toString()}`);
        });

        socket.onStockTrade((trade) => {
            console.log(`${new Date().toLocaleString()} :: TRADE: ${JSON.stringify(trade)}`);
        });

        socket.onStockQuote(async (quote) => {
            // Handle stock quote changes for each stock
            await this[quote.Symbol].handleQuoteChangeForPurchase(quote);
        });

        socket.onStockBar((bar) => {
            console.log(`${new Date().toLocaleString()} :: BAR: ${JSON.stringify(bar)}`);
        });

        socket.onStatuses((s) => {
            console.log(`${new Date().toLocaleString()} :: STATUS: ${JSON.stringify(s)}`);
            this.lastKnownStatus = s; // Update the last known status
        });

        socket.onStateChange((state) => {
            console.log(`${new Date().toLocaleString()} :: STATE CHANGED: ${JSON.stringify(state)}`);
        });

        socket.onDisconnect(() => {
            console.log(`${new Date().toLocaleString()} :: Socket disconnected`);
        });

        socket.connect(); // Connect to the data stream
        this.scheduleDailyReconnect(socket); // Schedule daily reconnect
        this.scheduleDailyDisconnect(socket); // Schedule daily disconnect
    }

    /**
     * Schedules a daily reconnect to the Alpaca data stream.
     * @param {Object} socket - Alpaca data stream instance.
     */
    scheduleDailyReconnect(socket) {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 7;
        rule.minute = 58;
        rule.tz = 'America/New_York';
        rule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(rule, () => {
            if (this.lastKnownStatus === "connected" || this.lastKnownStatus === "authenticated") {
                console.log(`${new Date().toLocaleString()} :: Socket already connected, skipping reconnect`);
                return;
            }
            socket.connect();
        });
    }

    /**
     * Schedules a daily disconnect from the Alpaca data stream.
     * @param {Object} socket - Alpaca data stream instance.
     */
    scheduleDailyDisconnect(socket) {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 16;
        rule.minute = 1;
        rule.tz = 'America/New_York';
        rule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(rule, () => {
            socket.disconnect();
        });
    }
}

module.exports = DataStream;