//Defaults to buying VOO for DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE everyday


let STOCK_LIST;
try {
    STOCK_LIST = process.env.STOCK_LIST ?? 'VOO';
    STOCK_LIST = STOCK_LIST.split(/\s*,\s*/);
} catch (error) {
    STOCK_LIST = ['VOO'];
    console.log(`${new Date().toLocaleString()} :: invalid event string for STOCK_LIST: ${JSON.stringify(error)}`);
}
// Enabled trades
let DAILY_ENABLED_TRADES;
try {
    DAILY_ENABLED_TRADES = process.env.DAILY_ENABLED_TRADES ?? 'DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE';
    DAILY_ENABLED_TRADES = DAILY_ENABLED_TRADES.split(/\s*,\s*/);
} catch (error) {
    DAILY_ENABLED_TRADES = ['DAILY_PURCHASE', 'PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE'];
    console.log(`${new Date().toLocaleString()} :: invalid event string for DAILY_ENABLED_TRADES: ${JSON.stringify(error)}`);
}

// Enabled trades for last x order purchase average
let AVG_TRADES = [], LAST_X_AVG_TRADES_QTY = [];
try {
    AVG_TRADES = DAILY_ENABLED_TRADES.filter(event => event.startsWith("PRICE_LOWER_THAN_LAST"));
    LAST_X_AVG_TRADES_QTY = AVG_TRADES.map(event => +event.split("_")[4]);
} catch (error) {
    AVG_TRADES = [], LAST_X_AVG_TRADES_QTY = [];
    console.log(`${new Date().toLocaleString()} :: invalid event string for LAST_X_ORDER_PURCHASE_AVERAGE: ${JSON.stringify(error)}`);
}

module.exports = { STOCK_LIST, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY };