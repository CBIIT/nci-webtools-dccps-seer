FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
    && dnf -y install \
    nodejs24 \
    R-4.3.2 \
    tar \ 
    gzip \
    shadow-utils \
    && dnf clean all

RUN npm install -g npm@latest
RUN npm update -g

# restrict python3.9 to root user
RUN chmod 700 /usr/bin/python3.9 

RUN groupadd -g 1000 appgroup \
    && useradd -u 1000 -g appgroup -m -s /bin/bash app \
    && mkdir -p /app/server /app/r-packages

WORKDIR /app/server

# copy package lock files
COPY r-packages /app/r-packages
COPY server/renv.lock server/.Rprofile ./
COPY server/renv/activate.R server/renv/settings.json ./renv/
COPY server/package.json server/package-lock.json ./
RUN chown -R app:appgroup /app

USER app

# install R packages with renv
RUN R -e "\
    options(renv.config.repos.override = 'https://packagemanager.posit.co/cran/__linux__/rhel9/latest'); \
    renv::restore();"

RUN npm install

COPY server/server.js server/worker.js ./
COPY server/cansurv ./cansurv
COPY server/jpsurv ./jpsurv
COPY server/recurrence ./recurrence
COPY server/services ./services
COPY server/templates ./templates

RUN touch .env

CMD npm start
