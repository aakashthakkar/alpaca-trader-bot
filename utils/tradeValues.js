// Defaults to buying VOO for DAILY_PURCHASE and PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE every day

// List of stocks to trade, fetched from environment variables or defaults to 'VOO'
let STOCK_LIST;
try {
    STOCK_LIST = process.env.STOCK_LIST ?? 'VOO';
    STOCK_LIST = STOCK_LIST.split(/\s*,\s*/); // Split by commas and trim spaces
} catch (error) {
    STOCK_LIST = ['VOO'];
    console.log(`${new Date().toLocaleString()} :: invalid event string for STOCK_LIST: ${JSON.stringify(error)}`);
}

// Enabled trade scenarios, fetched from environment variables or defaults to predefined values
let DAILY_ENABLED_TRADES;
try {
    DAILY_ENABLED_TRADES = process.env.DAILY_ENABLED_TRADES ?? 'DAILY_PURCHASE,PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE';
    DAILY_ENABLED_TRADES = DAILY_ENABLED_TRADES.split(/\s*,\s*/); // Split by commas and trim spaces
} catch (error) {
    DAILY_ENABLED_TRADES = ['DAILY_PURCHASE', 'PRICE_LOWER_THAN_AVERAGE_PURCHASE_PRICE'];
    console.log(`${new Date().toLocaleString()} :: invalid event string for DAILY_ENABLED_TRADES: ${JSON.stringify(error)}`);
}

// Trade scenarios based on the last X order purchase averages
let AVG_TRADES = [], LAST_X_AVG_TRADES_QTY = [];
try {
    // Filter scenarios that start with "PRICE_LOWER_THAN_LAST" and extract the quantity (X)
    AVG_TRADES = DAILY_ENABLED_TRADES.filter(event => event.startsWith("PRICE_LOWER_THAN_LAST"));
    LAST_X_AVG_TRADES_QTY = AVG_TRADES.map(event => +event.split("_")[4]); // Extract the number after "LAST_"
} catch (error) {
    AVG_TRADES = [], LAST_X_AVG_TRADES_QTY = [];
    console.log(`${new Date().toLocaleString()} :: invalid event string for LAST_X_ORDER_PURCHASE_AVERAGE: ${JSON.stringify(error)}`);
}

// Export the parsed configuration values for use in other modules
module.exports = { STOCK_LIST, DAILY_ENABLED_TRADES, LAST_X_AVG_TRADES_QTY };