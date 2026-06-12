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
    && useradd -u 1000 -g appgroup -m -s /bin/bash app

RUN mkdir -p /app/server

WORKDIR /app/server

# install R packages with renv
COPY r-packages /app/r-packages
COPY server/renv.lock /app/server/
COPY server/.Rprofile /app/server/
COPY server/renv/activate.R /app/server/renv/
COPY server/renv/settings.json /app/server/renv/
RUN R -e "\
    options(renv.config.repos.override = 'https://packagemanager.posit.co/cran/__linux__/rhel9/latest'); \
    renv::restore();"


COPY server/package.json server/package-lock.json ./
RUN npm install

# copy everything else
COPY server/server.js server/worker.js ./
COPY server/cansurv ./cansurv
COPY server/jpsurv ./jpsurv
COPY server/recurrence ./recurrence
COPY server/services ./services
COPY server/templates ./templates

# Create ENV file if it doesn't exist https://github.com/nodejs/node/issues/50993
RUN touch .env

RUN chown -R app:appgroup /app

USER app
CMD npm start
