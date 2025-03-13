FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock api.js ./

RUN yarn install

CMD ["node", "api.js"]
