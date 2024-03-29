const schedule = require('node-schedule');

class DailyPurchaseClass {
    constructor(alpaca, stockTicker, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY) {
        // initialized values
        this.alpaca = alpaca;
        this.stockTicker = stockTicker;
        this.dailySchedules();
        this.DAILY_ENABLED_TRADES = DAILY_ENABLED_TRADES;

        // changes accordingly
        this.pricingInitialized = false;
        this.totalTradesToday = Object.assign([], this.DAILY_ENABLED_TRADES);
        this.totalOrderFailures = 0;
        this.avg_entry_price = {};
        this.LAST_X_AVG_TRADES_QTY = LAST_X_AVG_TRADES_QTY;
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
        openRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(openRule, () => {
            DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = false;
        });

        const beforeCloseRule = new schedule.RecurrenceRule();
        beforeCloseRule.hour = 15;
        beforeCloseRule.minute = 59;
        beforeCloseRule.tz = 'America/New_York';
        beforeCloseRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(beforeCloseRule, () => {
            DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = true;
        });

        const afterCloseRule = new schedule.RecurrenceRule();
        afterCloseRule.hour = 16;
        afterCloseRule.minute = 1;
        afterCloseRule.tz = 'America/New_York';
        afterCloseRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(afterCloseRule, async () => {
            // cancel all open orders, since we do not check for holidays/weekends.
            try {
                await this.alpaca.cancelAllOrders();
            } catch (error) {
                console.log(`${new Date().toLocaleString()} :: couldn't cancel all orders: ${JSON.stringify(error)}`);
            }
        });
    }

    scheduleDailyStockPurchase() {
        const rule = new schedule.RecurrenceRule();
        rule.hour = 6;
        rule.minute = 25;
        rule.tz = 'America/New_York';
        rule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(rule, async () => {
            this.totalTradesToday = Object.assign([], this.DAILY_ENABLED_TRADES);
            this.totalOrderFailures = 0;
            this.pricingInitialized = false;
            if(this.totalTradesToday.includes("DAILY_PURCHASE")) {
                console.log(`${new Date().toLocaleString()} :: Invoking daily purchase for ${this.stockTicker}`)
                await this.buyTenDollarStock("DAILY_PURCHASE");
            }
        });
    }

    /*
        Order methods
    */
    async buyTenDollarStock(event) {
        try {
            this.totalTradesToday.splice(this.totalTradesToday.indexOf(event), 1);
            // double check market still open after 3:59PM
            if (DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER && await !this.alpaca.getClock().is_open) return;
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
            this.avg_entry_price.overall_avg_entry_price = await this.getStockAverageEntryPrice();
            await this.LAST_X_AVG_TRADES_QTY.forEach(async (x) => {
                const average = await this.getLastXOrderPurchaseAverage(x);
                this.avg_entry_price[`last_${x}_order_avg_price`] = average;
            });
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
    async getLastXOrderPurchaseAverage(x) {
        try {
            const orders = await this.alpaca.getOrders({
                side: 'buy',
                status: 'filled',
                symbol: this.stockTicker,
                limit: x
            });
            const stock_orders = orders.filter(order => order.symbol === this.stockTicker);
            const stock_order_prices = stock_orders.map(order => order.filled_avg_price);
            const stock_order_prices_sum = stock_order_prices.reduce((a, b) => +a + +b, 0);
            return stock_order_prices_sum / stock_order_prices.length;
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't get last ${x} order purchase average for ${this.stockTicker} stock: ${JSON.stringify(error)}`);
        }
    }

    /*
        Event handlers
    */
    async handleQuoteChangeForPurchase(quote) {
        // first time initialization of pricing information
        if (!this.pricingInitialized) { await this.updateStockPricing(); this.pricingInitialized = true; }
        const currentPurchasePrice = quote.AskPrice;
        this.totalTradesToday.forEach(async (event) => {
            switch (event) {
                case "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE":
                    if (!!currentPurchasePrice && (currentPurchasePrice < this.avg_entry_price.overall_avg_entry_price)) {
                        console.log(`${new Date().toLocaleString()} :: Invoking ${event} purchase because current purchase price of ${currentPurchasePrice} is lower than ${this.avg_entry_price.overall_avg_entry_price} for ${this.stockTicker}`)
                        await this.buyTenDollarStock(event);
                    }
                    break;
                default:
                    //do nothing;
                    break;
            }
            // check for last x order purchase average
            if(event.startsWith("PRICE_LOWER_THAN_LAST")) {
                try {
                    const x = event.split("_")[4];
                    if (!!currentPurchasePrice && (currentPurchasePrice < this.avg_entry_price[`last_${x}_order_avg_price`])) {
                        console.log(`${new Date().toLocaleString()} :: Invoking ${event} purchase because current purchase price of ${currentPurchasePrice} is lower than ${this.avg_entry_price[`last_${x}_order_avg_price`]} for ${this.stockTicker}`)
                        await this.buyTenDollarStock(event);
                    }
                } catch (error) {
                    console.log(`${new Date().toLocaleString()} :: invalid event string ${event} for ${this.stockTicker} stock: ${JSON.stringify(error)}`);
                }
            }
        });
    }
}


module.exports = DailyPurchaseClass;