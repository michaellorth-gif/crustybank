# Two-stage build: compile client + server, then ship a lean production image.
# Works on Railway, Render, Fly.io, or any Docker host.

FROM node:20-slim AS build
WORKDIR /app
# better-sqlite3 compiles from source if no prebuilt binary matches
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci --omit=dev --no-audit --no-fund && apt-get purge -y python3 make g++ && apt-get autoremove -y
# Compiled server and built client
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist

# SQLite lives on a mounted volume; default under /data
ENV DATABASE_PATH=/data/app.db
ENV PORT=5000
EXPOSE 5000

# Initialize/migrate the database, then start the server
CMD ["sh", "-c", "node server/dist/db/setup.js && node server/dist/index.js"]
