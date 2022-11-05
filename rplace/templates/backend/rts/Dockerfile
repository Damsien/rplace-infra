FROM node:current-alpine3.16

WORKDIR /usr/src/app

COPY package*.json ./

COPY . .
RUN rm -rf ./nodes_modules
RUN rm -rf ./dist

RUN npm install yarn --legacy-peer-deps
RUN yarn install
RUN yarn run build

CMD ["yarn", "run", "start:prod"]