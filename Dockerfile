# syntax=docker/dockerfile:1
FROM --platform=linux/amd64 node:18-alpine
ADD --keep-git-dir=true https://github.com/aakashthakkar/alpaca-trading-bot.git#main /alpaca-trading-bot
ENV API_KEY="${API_KEY}"
ENV SECRET_KEY="${SECRET_KEY}"
ENV IS_PAPER="${IS_PAPER}"

WORKDIR /alpaca-trading-bot
RUN npm i
CMD ["npm", "run", "start", ">>", "logs.txt"]