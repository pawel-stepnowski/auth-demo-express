FROM node:18
WORKDIR /usr/src/app
COPY package.template.json ./package.json
COPY src ./src/
COPY schemas ./schemas/
RUN npm install
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]