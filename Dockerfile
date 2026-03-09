FROM node:20-alpine

WORKDIR /app

# Install frontend dependencies and build
COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts eslint.config.js index.html ./
COPY src/ src/
COPY public/ public/

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npx vite build

# Install backend dependencies
COPY server/package.json server/package-lock.json* server/
RUN cd server && npm install --omit=dev

# Copy backend source
COPY server/ server/

EXPOSE 3001

CMD ["node", "server/server.js"]
