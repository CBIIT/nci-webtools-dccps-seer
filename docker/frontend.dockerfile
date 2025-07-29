FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   gcc-c++ \
   httpd \
   make \
   nodejs \
   npm \
   && dnf clean all

RUN mkdir -p /app/client

WORKDIR /app/client

COPY client/package.json /app/client/

RUN npm install

COPY client /app/client/

ARG API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL $API_BASE_URL
RUN echo "NEXT_PUBLIC_API_BASE_URL=$API_BASE_URL" >> .env.local

RUN npm run build 

EXPOSE 80
EXPOSE 443

CMD npm run start