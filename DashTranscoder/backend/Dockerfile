FROM node:16-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN apk add --no-cache ffmpeg

EXPOSE 5000

CMD ["npm", "start"]

