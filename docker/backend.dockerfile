FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
    && dnf -y install \
    nodejs20 \
    nodejs20-npm  \
    tar \ 
    R-4.3.2 \
    gzip \
    && dnf clean all

RUN ln -s -f /usr/bin/node-20 /usr/bin/node; ln -s -f /usr/bin/npm-20 /usr/bin/npm;
RUN mkdir -p /app/server

WORKDIR /app/server

# install R packages with renv
COPY r-packages /app/r-packages
COPY server /app/server/
COPY server/.Rprofile /app/server/
COPY server/renv/activate.R /app/server/renv/
COPY server/renv/settings.json /app/server/renv/

RUN R -e "\
    options(\
    renv.config.repos.override = 'https://packagemanager.posit.co/cran/__linux__/rhel9/latest', \
    Ncpus = parallel::detectCores() \
    ); \
    renv::restore();"

COPY server/package.json server/package-lock.json ./

RUN npm install

# Create ENV file if it doesn't exist https://github.com/nodejs/node/issues/50993
RUN touch .env

CMD npm start