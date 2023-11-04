"use strict";
const DataStream = require("./socket/datastream");

(new DataStream({
    apiKey: process.env.API_KEY,
    secretKey: process.env.SECRET_KEY,
    feed: "iex",
    paper: process.env.IS_PAPER
}));