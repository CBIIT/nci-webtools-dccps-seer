FROM quay.io/centos/centos:stream8

RUN dnf -y update \
    && dnf -y install \
    dnf-plugins-core \
    epel-release \
    glibc-langpack-en \
    && dnf config-manager --enable powertools \
    && dnf -y module enable nodejs:14 \
    && dnf -y install \
    gcc-c++ \
    make \
    httpd-devel \
    openssl-devel \
    R \
    nodejs \
    && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# install renv
RUN R -e "install.packages('renv', repos = 'https://cloud.r-project.org/')"

# install R packages
COPY server/renv.lock /app/server/
COPY r-packages /app/r-packages

WORKDIR /app/server

RUN Rscript -e "renv::restore()"

# install JPSurv
# COPY r-packages /app/r-packages
# RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

# copy server
COPY server /app/server/
COPY server /app/server/jpsurv
COPY docker/additional-configuration.conf /app/wsgi/additional-configuration.conf

WORKDIR /app/server/queueProcessor

RUN npm install

WORKDIR /app/server

CMD node queueProcessor/queue-worker.js

