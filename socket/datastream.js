const Alpaca = require("@alpacahq/alpaca-trade-api");
const voo = require("../trading/voo");

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

        socket.onStockQuote((quote) => {
            switch (quote.Symbol) {
                case "VOO":
                    this.vooObj.handleQuoteChange(quote);
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
            this.vooObj.pricingInitialized = false;
            console.log(state);
        });

        socket.onDisconnect(() => {
            console.log("Disconnected");
        });


        socket.connect();
    }
}

module.exports = DataStream;