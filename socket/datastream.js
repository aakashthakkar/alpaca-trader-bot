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
    rule.hour = 18;
    rule.minute = 0;
    rule.tz = 'America/New_York';

    schedule.scheduleJob(rule, () => {
        socket.disconnect();
    });
}

function scheduleDailyReconnect(socket) {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 7;
    rule.minute = 0;
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
            console.log("Connected");
            socket.subscribeForQuotes(["VOO"]);
        });

        socket.onError((err) => {
            console.log("err" + err.toString());
        });

        socket.onStockTrade((trade) => {
            console.log(trade);
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
            console.log(bar);
        });

        socket.onStatuses((s) => {
            console.log(s);
        });

        socket.onStateChange((state) => {
            console.log(state);
        });

        socket.onDisconnect(() => {
            console.log("Disconnected");
        });


        socket.connect();
    }
}

module.exports = DataStream;