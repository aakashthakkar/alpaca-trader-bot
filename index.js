"use strict";
const config = require("./config");
const DataStream = require("./socket/datastream");

(new DataStream({
    apiKey: config.API_KEY,
    secretKey: config.API_SECRET,
    feed: "iex",
    paper: true
}));