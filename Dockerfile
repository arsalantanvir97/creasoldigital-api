FROM node:16.13.0-alpine

WORKDIR /app

COPY package*.json ./

RUN yarn install

COPY . .

EXPOSE 4001

CMD ["yarn", "dev"]