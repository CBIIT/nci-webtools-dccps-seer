FROM public.ecr.aws/amazonlinux/amazonlinux:2023 AS builder

RUN dnf -y update \
    && dnf -y install nodejs24 \
    && dnf clean all

WORKDIR /app

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./

ARG API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL
ARG NEXT_PUBLIC_VERSION=local
ENV NEXT_PUBLIC_VERSION=$NEXT_PUBLIC_VERSION
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM public.ecr.aws/amazonlinux/amazonlinux:2023 AS runner

RUN dnf -y update \
    && dnf -y install nodejs24 \
    && dnf clean all

RUN npm install -g npm@latest
RUN npm update -g

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 80

CMD ["node", "server.js"]
