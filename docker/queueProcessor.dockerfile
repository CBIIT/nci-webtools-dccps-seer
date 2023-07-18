FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
 && dnf -y install \
    gcc-c++ \
    make \
    nodejs \
    npm \
    R \
 && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# install renv
RUN R -e "install.packages('renv', repos = 'https://cloud.r-project.org/')"

# install R packages with renv
COPY server/renv.lock /app/server/
COPY server/.Rprofile /app/server/
COPY server/renv/activate.R /app/server/renv/
COPY server/renv/settings.dcf /app/server/renv/
COPY r-packages /app/r-packages

WORKDIR /app/server
RUN R -e "options(Ncpus=parallel::detectCores()); renv::restore()"

WORKDIR /app/server

# install JPSurv
# COPY r-packages /app/r-packages
# RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

# copy server
COPY server /app/server/
# COPY server /app/server/jpsurv
# COPY docker/additional-configuration.conf /app/wsgi/additional-configuration.conf

WORKDIR /app/server/queueProcessor

RUN npm install

WORKDIR /app/server

CMD node queueProcessor/queue-worker.js

