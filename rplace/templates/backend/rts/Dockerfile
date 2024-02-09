FROM node:18.18.2-alpine3.17

WORKDIR /usr/src/app

COPY package*.json ./

COPY . .
RUN rm -rf ./nodes_modules
RUN rm -rf ./dist

RUN yarn global add @nestjs/cli
RUN yarn install
RUN yarn run build

CMD ["yarn", "run", "start:prod"]