class voo {
    constructor(alpaca) {
        this.alpaca = alpaca;
        this.pricingInitialized = false;
    };
    static TOTAL_TRADES_TODAY = ["DAILY_PURCHASE", "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE", "PRICE_LOWER_THAN_LAST_TWENTY_ORDER_PURCHASE_AVERAGE", "PRICE_LOWER_THAN_LAST_HUNDRED_ORDER_PURCHASE_AVERAGE"];

    async buyTenDollarVoo(event) {
        try {
            voo.TOTAL_TRADES_TODAY.splice(voo.TOTAL_TRADES_TODAY.indexOf(event), 1);
            await this.alpaca.createOrder({
                symbol: 'VOO',
                notional: 10,
                side: 'buy',
                type: "market",
                time_in_force: "day"
            });
            console.log("Purchased 10 dollars of VOO for event: " + event);
            // update only if order succeeds
            this.updateVooPricing();
        } catch (error) {
            // order failed, add event back to array
            voo.TOTAL_TRADES_TODAY.push(event);
            console.log("couldn't place order + " + JSON.stringify(error));
        }
    }

    async updateVooPricing() {
        try {
            this.avg_entry_price = await this.getVooAverageEntryPrice();
            this.avg_last_twenty_order_purchase_price = await this.getLastTwentyOrderPurchaseAverage();
            this.avg_last_hundred_order_purchase_price = await this.getLastHundredOrderPurchaseAverage();
        } catch (error) {
            console.log("couldn't update VOO pricing + " + JSON.stringify(error));
        }
    }

    async getVooAverageEntryPrice() {
        try {
            const positions = await this.alpaca.getPositions();
            const voo_asset_information = positions.find(position => position.symbol === 'VOO');
            return +voo_asset_information.avg_entry_price;
        } catch (error) {
            console.log("couldn't get VOO average entry price + " + JSON.stringify(error));
        }
    }

    
    async getLastTwentyOrderPurchaseAverage() {
        try {
            const orders = await this.alpaca.getOrders({
                status: 'filled',
                limit: 20
            });
            const voo_orders = orders.filter(order => order.symbol === 'VOO');
            const voo_order_prices = voo_orders.map(order => order.filled_avg_price);
            const voo_order_prices_sum = voo_order_prices.reduce((a, b) => +a + +b, 0);
            return voo_order_prices_sum / voo_order_prices.length;
        } catch (error) {
            console.log("couldn't get last twenty order purchase average + " + JSON.stringify(error));
        }
    }
    async getLastHundredOrderPurchaseAverage() {
        try {
            const orders = await this.alpaca.getOrders({
                status: 'filled',
                limit: 100
            });
            const voo_orders = orders.filter(order => order.symbol === 'VOO');
            const voo_order_prices = voo_orders.map(order => order.filled_avg_price);
            const voo_order_prices_sum = voo_order_prices.reduce((a, b) => +a + +b, 0);
            return voo_order_prices_sum / voo_order_prices.length;
        } catch (error) {
            console.log("couldn't get last hundred order purchase average + " + JSON.stringify(error));
        }
    }


    async handleQuoteChange(quote) {
        // first time initialization of pricing information
        if(!this.pricingInitialized) {await this.updateVooPricing(); this.pricingInitialized = true;}
        const currentPurchasePrice = quote.AskPrice;
        voo.TOTAL_TRADES_TODAY.forEach(event => {
            switch (event) {
                case "DAILY_PURCHASE":
                    this.buyTenDollarVoo('DAILY_PURCHASE');
                    break;
                case "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE":
                    if (currentPurchasePrice < this.avg_entry_price) {
                        this.buyTenDollarVoo('PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE');
                    }
                    break;
                case "PRICE_LOWER_THAN_LAST_TWENTY_ORDER_PURCHASE_AVERAGE":
                    if (currentPurchasePrice < this.avg_last_twenty_order_purchase_price) {
                        this.buyTenDollarVoo('PRICE_LOWER_THAN_LAST_TWENTY_ORDER_PURCHASE_AVERAGE');
                    }
                    break;
                case "PRICE_LOWER_THAN_LAST_HUNDRED_ORDER_PURCHASE_AVERAGE":
                    if (currentPurchasePrice < this.avg_last_hundred_order_purchase_price) {
                        this.buyTenDollarVoo('PRICE_LOWER_THAN_LAST_HUNDRED_ORDER_PURCHASE_AVERAGE');
                    }
                    break;
                default:
                    //do nothing;
                    break;
            }
        });
    }
}


module.exports = voo;