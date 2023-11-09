const schedule = require('node-schedule');
const DAILY_ENABLED_TRADES = ["DAILY_PURCHASE", "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE"];



class TenDollarStockPurchaseClass {
    constructor(alpaca, stockTicker) {
        this.alpaca = alpaca;
        this.pricingInitialized = false;
        this.stockTicker = stockTicker;
        this.totalTradesToday = Object.assign([], DAILY_ENABLED_TRADES);
        this.totalOrderFailures = 0;
        this.dailySchedules();
    };
    static DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = false;
    
    /*
    Scheduling methods
    */
    dailySchedules() {
        this.scheduleDailyStockPurchase();
    }

    // common methods for market open and close
    static initializeCommonSchedules() {
        const openRule = new schedule.RecurrenceRule();
        openRule.hour = 6;
        openRule.minute = 0;
        openRule.tz = 'America/New_York';
    
        schedule.scheduleJob(openRule, () => {
            TenDollarStockPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = false;
        });
        
        const closeRule = new schedule.RecurrenceRule();
        closeRule.hour = 15;
        closeRule.minute = 59;
        closeRule.tz = 'America/New_York';
    
        schedule.scheduleJob(closeRule, () => {
            TenDollarStockPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = true;
        });
    }
     
    scheduleDailyStockPurchase() {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 6;
        rule.minute = 0;
        rule.tz = 'America/New_York';

        schedule.scheduleJob(rule, () => {
            this.totalTradesToday = Object.assign([], DAILY_ENABLED_TRADES);
            this.totalOrderFailures = 0;
            this.pricingInitialized = false;
        });
    }

    /*
        Order methods
    */
    async buyTenDollarStock(event) {
        try {
            // double check market open after 3:59PM
            this.totalTradesToday.splice(this.totalTradesToday.indexOf(event), 1);
            if (TenDollarStockPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER && await !this.alpaca.getClock().is_open) return;
            await this.alpaca.createOrder({
                symbol: this.stockTicker,
                notional: 10,
                side: 'buy',
                type: "market",
                time_in_force: "day"
            });
            console.log(`${new Date().toLocaleString()} :: Purchased 10 dollars of ${this.stockTicker} for event:  ${event}`);
            // update only if order succeeds
            await this.updateStockPricing();
        } catch (error) {
            // order failed, add event back to array. Limit adding event back to avoid infinite loop of orders
            if (++this.totalOrderFailures < 5) this.totalTradesToday.push(event);
            console.log(`${new Date().toLocaleString()} :: couldn't place order ${JSON.stringify(error)}`);
        }

    }

    /*
        Pricing methods
    */
    async updateStockPricing() {
        try {
            this.avg_entry_price = await this.getStockAverageEntryPrice();
            this.avg_last_twenty_order_purchase_price = await this.getLastTwentyOrderPurchaseAverage();
            this.avg_last_hundred_order_purchase_price = await this.getLastHundredOrderPurchaseAverage();
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't update ${this.stockTicker} stock pricing :${JSON.stringify(error)}`);
        }
    }
    async getStockAverageEntryPrice() {
        try {
            const positions = await this.alpaca.getPositions();
            const stock_asset_information = positions.find(position => position.symbol === this.stockTicker);
            return +stock_asset_information.avg_entry_price;
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't get ${this.stockTicker} average entry price : ${JSON.stringify(error)}`);
        }
    }
    async getLastTwentyOrderPurchaseAverage() {
        try {
            const orders = await this.alpaca.getOrders({
                status: 'filled',
                limit: 20
            });
            const stock_orders = orders.filter(order => order.symbol === this.stockTicker);
            const stock_order_prices = stock_orders.map(order => order.filled_avg_price);
            const stock_order_prices_sum = stock_order_prices.reduce((a, b) => +a + +b, 0);
            return stock_order_prices_sum / stock_order_prices.length;
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't get last twenty order purchase average for ${this.stockTicker} stock: ${JSON.stringify(error)}`);
        }
    }
    async getLastHundredOrderPurchaseAverage() {
        try {
            const orders = await this.alpaca.getOrders({
                status: 'filled',
                limit: 100
            });
            const stock_orders = orders.filter(order => order.symbol === this.stockTicker);
            const stock_order_prices = stock_orders.map(order => order.filled_avg_price);
            const stock_order_prices_sum = stock_order_prices.reduce((a, b) => +a + +b, 0);
            return stock_order_prices_sum / stock_order_prices.length;
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't get last hundred order purchase average for ${this.stockTicker} stock: ${JSON.stringify(error)}`);
        }
    }

    /*
        Event handlers
    */
    async handleQuoteChange(quote) {
        // first time initialization of pricing information
        if (!this.pricingInitialized) { await this.updateStockPricing(); this.pricingInitialized = true; }
        const currentPurchasePrice = quote.AskPrice;
        this.totalTradesToday.forEach(event => {
            switch (event) {
                case "DAILY_PURCHASE":
                    this.buyTenDollarStock('DAILY_PURCHASE');
                    break;
                case "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE":
                    if (currentPurchasePrice < this.avg_entry_price) {
                        this.buyTenDollarStock('PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE');
                    }
                    break;
                case "PRICE_LOWER_THAN_LAST_TWENTY_ORDER_PURCHASE_AVERAGE":
                    if (currentPurchasePrice < this.avg_last_twenty_order_purchase_price) {
                        this.buyTenDollarStock('PRICE_LOWER_THAN_LAST_TWENTY_ORDER_PURCHASE_AVERAGE');
                    }
                    break;
                case "PRICE_LOWER_THAN_LAST_HUNDRED_ORDER_PURCHASE_AVERAGE":
                    if (currentPurchasePrice < this.avg_last_hundred_order_purchase_price) {
                        this.buyTenDollarStock('PRICE_LOWER_THAN_LAST_HUNDRED_ORDER_PURCHASE_AVERAGE');
                    }
                    break;
                default:
                    //do nothing;
                    break;
            }
        });
    }
}


module.exports = TenDollarStockPurchaseClass;