# syntax=docker/dockerfile:1
FROM node:18-alpine
ADD --keep-git-dir=true https://github.com/aakashthakkar/alpaca-trading-bot.git#main /alpaca-trading-bot
ENV API_KEY="<your-api-key>"
ENV SECRET_KEY="<your-secret-key>"
ENV IS_PAPER=true

WORKDIR /alpaca-trading-bot
RUN npm i
CMD ["npm", "run", "start"]