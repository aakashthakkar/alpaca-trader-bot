const schedule = require('node-schedule');

/**
 * Class to handle daily stock purchases based on predefined rules and schedules.
 */
class DailyPurchaseClass {
    /**
     * Constructor to initialize the DailyPurchaseClass.
     * @param {Object} alpaca - Alpaca API client instance.
     * @param {string} stockTicker - Stock ticker symbol to trade.
     * @param {Array} DAILY_ENABLED_TRADES - List of enabled trade scenarios.
     * @param {Array} LAST_X_AVG_TRADES_QTY - List of quantities for last X order averages.
     */
    constructor(alpaca, stockTicker, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY) {
        this.alpaca = alpaca; // Alpaca API client
        this.stockTicker = stockTicker; // Stock ticker symbol
        this.dailySchedules(); // Initialize daily schedules
        this.DAILY_ENABLED_TRADES = DAILY_ENABLED_TRADES; // Enabled trade scenarios

        // State variables
        this.pricingInitialized = false; // Flag to check if pricing is initialized
        this.totalTradesToday = Object.assign([], this.DAILY_ENABLED_TRADES); // Tracks trades for the day
        this.totalOrderFailures = 0; // Tracks order failures
        this.avg_entry_price = {}; // Stores average entry prices
        this.LAST_X_AVG_TRADES_QTY = LAST_X_AVG_TRADES_QTY; // Quantities for last X order averages
    };

    // Static property to double-check market closure before placing orders
    static DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = false;

    /**
     * Initializes daily schedules for stock purchases.
     */
    dailySchedules() {
        this.scheduleDailyStockPurchase();
    }

    /**
     * Static method to initialize common schedules for market open and close events.
     */
    static initializeCommonSchedules() {
        // Schedule to reset market close flag at market open
        const openRule = new schedule.RecurrenceRule();
        openRule.hour = 6;
        openRule.minute = 0;
        openRule.tz = 'America/New_York';
        openRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(openRule, () => {
            DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = false;
        });

        // Schedule to set market close flag before market close
        const beforeCloseRule = new schedule.RecurrenceRule();
        beforeCloseRule.hour = 15;
        beforeCloseRule.minute = 59;
        beforeCloseRule.tz = 'America/New_York';
        beforeCloseRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(beforeCloseRule, () => {
            DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER = true;
        });

        // Schedule to cancel all open orders after market close
        const afterCloseRule = new schedule.RecurrenceRule();
        afterCloseRule.hour = 16;
        afterCloseRule.minute = 1;
        afterCloseRule.tz = 'America/New_York';
        afterCloseRule.dayOfWeek = [new schedule.Range(1, 5)];

        schedule.scheduleJob(afterCloseRule, async () => {
            try {
                await this.alpaca.cancelAllOrders();
            } catch (error) {
                console.log(`${new Date().toLocaleString()} :: couldn't cancel all orders: ${JSON.stringify(error)}`);
            }
        });
    }

    /**
     * Schedules daily stock purchases at a specific time.
     */
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
            if (this.totalTradesToday.includes("DAILY_PURCHASE")) {
                console.log(`${new Date().toLocaleString()} :: Invoking daily purchase for ${this.stockTicker}`);
                await this.buyTenDollarStock("DAILY_PURCHASE");
            }
        });
    }

    /**
     * Places a $10 stock purchase order.
     * @param {string} event - The trade scenario triggering the purchase.
     */
    async buyTenDollarStock(event) {
        try {
            this.totalTradesToday.splice(this.totalTradesToday.indexOf(event), 1);
            if (DailyPurchaseClass.DOUBLE_CHECK_MARKET_CLOSE_BEFORE_ORDER && await !this.alpaca.getClock().is_open) return;
            await this.alpaca.createOrder({
                symbol: this.stockTicker,
                notional: 10,
                side: 'buy',
                type: "market",
                time_in_force: "day"
            });
            console.log(`${new Date().toLocaleString()} :: Purchased 10 dollars of ${this.stockTicker} for event:  ${event}`);
            await this.updateStockPricing();
        } catch (error) {
            if (++this.totalOrderFailures < 5) this.totalTradesToday.push(event);
            console.log(`${new Date().toLocaleString()} :: couldn't place order ${JSON.stringify(error)}`);
        }
    }

    /**
     * Updates stock pricing information, including overall and last X order averages.
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

    /**
     * Retrieves the overall average entry price of the stock.
     * @returns {number} - The average entry price.
     */
    async getStockAverageEntryPrice() {
        try {
            const positions = await this.alpaca.getPositions();
            const stock_asset_information = positions.find(position => position.symbol === this.stockTicker);
            return +stock_asset_information.avg_entry_price;
        } catch (error) {
            console.log(`${new Date().toLocaleString()} :: couldn't get ${this.stockTicker} average entry price : ${JSON.stringify(error)}`);
        }
    }

    /**
     * Retrieves the average price of the last X orders.
     * @param {number} x - The number of recent orders to consider.
     * @returns {number} - The average price of the last X orders.
     */
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

    /**
     * Handles stock quote changes and triggers purchases based on trade scenarios.
     * @param {Object} quote - The stock quote data.
     */
    async handleQuoteChangeForPurchase(quote) {
        if (!this.pricingInitialized) { await this.updateStockPricing(); this.pricingInitialized = true; }
        const currentPurchasePrice = quote.AskPrice;
        this.totalTradesToday.forEach(async (event) => {
            switch (event) {
                case "PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE":
                    if (!!currentPurchasePrice && (currentPurchasePrice < this.avg_entry_price.overall_avg_entry_price)) {
                        console.log(`${new Date().toLocaleString()} :: Invoking ${event} purchase because current purchase price of ${currentPurchasePrice} is lower than ${this.avg_entry_price.overall_avg_entry_price} for ${this.stockTicker}`);
                        await this.buyTenDollarStock(event);
                    }
                    break;
                default:
                    break;
            }
            if (event.startsWith("PRICE_LOWER_THAN_LAST")) {
                try {
                    const x = event.split("_")[4];
                    if (!!currentPurchasePrice && (currentPurchasePrice < this.avg_entry_price[`last_${x}_order_avg_price`])) {
                        console.log(`${new Date().toLocaleString()} :: Invoking ${event} purchase because current purchase price of ${currentPurchasePrice} is lower than ${this.avg_entry_price[`last_${x}_order_avg_price`]} for ${this.stockTicker}`);
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