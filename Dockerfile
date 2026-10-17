# ===================================================
# Dockerfile E-PMPED Bapperida Tanggamus untuk CasaOS
# Menggunakan Debian-based (node:20-slim) untuk kompatibilitas
# penuh glibc dengan Vite & Rolldown native binding
# ===================================================
FROM node:20-slim

WORKDIR /app

# Copy dependency definition (hanya package.json agar bebas konflik lockfile)
COPY package.json ./

# Install dependensi (termasuk native binding untuk Linux glibc)
RUN npm install --legacy-peer-deps

# Copy seluruh source code aplikasi
COPY . .

# Build frontend production bundle (Vite + Rolldown)
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Health check mandiri via Node.js HTTP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({host: '127.0.0.1', port: 3000, path: '/', timeout: 2000}, (res) => process.exit(res.statusCode < 500 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

CMD ["npx", "tsx", "server.ts"]
