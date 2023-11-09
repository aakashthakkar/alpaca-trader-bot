const Alpaca = require("@alpacahq/alpaca-trade-api");
const TenDollarStockPurchaseClass = require("../trading/tenDollarStockPurchase");
const schedule = require('node-schedule');

class DataStream {
    constructor({ apiKey, secretKey, feed, paper = true }) {
        this.alpaca = new Alpaca({
            keyId: apiKey,
            secretKey,
            feed,
            paper
        });
        
        // VOO initialization
        this.voo = new TenDollarStockPurchaseClass(this.alpaca, 'VOO');

        const socket = this.alpaca.data_stream_v2;
        TenDollarStockPurchaseClass.scheduleEnableDoubleCheckMarketClosedBeforePlacingOrder();
        TenDollarStockPurchaseClass.scheduleDisableDoubleCheckMarketClosedBeforePlacingOrder();
        

        socket.onConnect(function () {
            console.log(`${new Date().toLocaleString()} :: Socket connected`);
            socket.subscribeForQuotes(["VOO"]);
        });

        socket.onError((err) => {
            console.log(`${new Date().toLocaleString()} :: ERR: ${err.toString()}`);
        });

        socket.onStockTrade((trade) => {
            console.log(`${new Date().toLocaleString()} :: TRADE: ${JSON.stringify(trade)}`);
        });

        socket.onStockQuote(async (quote) => {
            switch (quote.Symbol) {
                case "VOO":
                    await this.voo.handleQuoteChange(quote);
                    break;
                default:
                    //do nothing;
                    break;
            }
        });

        socket.onStockBar((bar) => {
            console.log(`${new Date().toLocaleString()} :: BAR: ${JSON.stringify(bar)}`);
        });

        socket.onStatuses((s) => {
            console.log(`${new Date().toLocaleString()} :: STATUS: ${JSON.stringify(s)}`);
        });

        socket.onStateChange((state) => {
            console.log(`${new Date().toLocaleString()} :: STATE CHANGED: ${JSON.stringify(state)}`);
        });

        socket.onDisconnect(() => {
            console.log(`${new Date().toLocaleString()} :: Socket disconnected`);
        });


        socket.connect();
        this.scheduleDailyReconnect();
        this.scheduleDailyDisconnect();
    }

    scheduleDailyReconnect() {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 7;
        rule.minute = 58;
        rule.tz = 'America/New_York';
    
        schedule.scheduleJob(rule, () => {
            this.alpaca.data_stream_v2connect().connect();
        });
    }
    
    scheduleDailyDisconnect () {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 16;
        rule.minute = 1;
        rule.tz = 'America/New_York';
    
        schedule.scheduleJob(rule, () => {
            this.alpaca.data_stream_v2connect().disconnect();
        });
    }
}

module.exports = DataStream;