FROM node:22-slim
RUN useradd -ms /bin/sh -u 1001 app
USER app

WORKDIR /app
COPY ./static ./static
COPY app.js package.json yarn.lock ./
RUN yarn install

COPY --chown=app:app . /app

CMD ["node", "app.js"]
