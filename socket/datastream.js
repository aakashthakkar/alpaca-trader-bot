const Alpaca = require("@alpacahq/alpaca-trade-api");
const voo = require("../trading/voo");
const schedule = require('node-schedule');

function dailySchedules(socket) {
    scheduleDailyStockPurchase();
    scheduleDailyReconnect(socket);
    scheduleDailyDisconnect(socket);
}

function scheduleDailyStockPurchase() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 6;
    rule.minute = 0;
    rule.tz = 'America/New_York';

    schedule.scheduleJob(rule, () => {
        voo.TOTAL_TRADES_TODAY = ["DAILY_PURCHASE", "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE"];
        voo.TOTAL_ORDER_FAILURES = 0;
    });
}

function scheduleDailyDisconnect(socket) {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 16;
    rule.minute = 1;
    rule.tz = 'America/New_York';

    schedule.scheduleJob(rule, () => {
        socket.disconnect();
    });
}

function scheduleDailyReconnect(socket) {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 7;
    rule.minute = 58;
    rule.tz = 'America/New_York';

    schedule.scheduleJob(rule, () => {
        socket.connect();
    });
}

class DataStream {
    constructor({ apiKey, secretKey, feed, paper = true }) {
        this.alpaca = new Alpaca({
            keyId: apiKey,
            secretKey,
            feed,
            paper
        });
       
        this.vooObj = new voo(this.alpaca);
        const socket = this.alpaca.data_stream_v2;
        dailySchedules(socket);

        socket.onConnect(function () {
            console.log(`${new Date().toLocaleString()} Socket connected`);
            socket.subscribeForQuotes(["VOO"]);
        });

        socket.onError((err) => {
            console.log(`${new Date().toLocaleString()} ERR: ${err.toString()}`);
        });

        socket.onStockTrade((trade) => {
            console.log(`${new Date().toLocaleString()} TRADE: ${JSON.stringify(trade)}`);
        });

        socket.onStockQuote(async (quote) => {
            switch (quote.Symbol) {
                case "VOO":
                    await this.vooObj.handleQuoteChange(quote);
                    break;
                default:
                    //do nothing;
                    break;
            }
        });

        socket.onStockBar((bar) => {
            console.log(`${new Date().toLocaleString()} BAR: ${JSON.stringify(bar)}`);
        });

        socket.onStatuses((s) => {
            console.log(`${new Date().toLocaleString()} STATUS: ${JSON.stringify(s)}`);
        });

        socket.onStateChange((state) => {
            console.log(`${new Date().toLocaleString()} STATE CHANGED: ${JSON.stringify(state)}`);
        });

        socket.onDisconnect(() => {
            console.log(`${new Date().toLocaleString()} Socket disconnected`);
        });


        socket.connect();
    }
}

module.exports = DataStream;