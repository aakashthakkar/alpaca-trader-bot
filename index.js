"use strict";
const DataStream = require("./socket/datastream");

const config = {
    apiKey: process.env.API_KEY,
    secretKey: process.env.SECRET_KEY,
    feed: "iex",
    paper: JSON.parse(process.env.IS_PAPER) ?? true
};

(new DataStream(config));