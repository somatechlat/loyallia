# =============================================================================
# Loyallia Frontend — Next.js Dev Server (Docker)
# React 18 + Next.js 14 with hot reload
# =============================================================================

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps \
    && node -e "console.log('tailwind:', require('tailwindcss/package.json').version)"
COPY . .
# Delete any lock file that might have bad version pins from the COPY
RUN rm -f package-lock.json bun.lock
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
