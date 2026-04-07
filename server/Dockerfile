FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY src ./src
RUN mkdir -p /app/data
RUN npm run seed
EXPOSE 8080
CMD ["npm", "run", "start"]
