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

RUN mkdir -p /deploy/app /deploy/logs /deploy/wsgi

# install renv
RUN R -e "install.packages('renv', repos = 'https://cloud.r-project.org/')"

# install R packages
COPY app/renv.lock /deploy/app/
COPY r-packages /deploy/r-packages

WORKDIR /deploy/app

RUN Rscript -e "renv::restore()"

# install JPSurv
# COPY r-packages /deploy/r-packages
# RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

# copy app
COPY app /deploy/app/
COPY app /deploy/app/jpsurv
COPY docker/additional-configuration.conf /deploy/wsgi/additional-configuration.conf

WORKDIR /deploy/app/queueProcessor

RUN npm install

WORKDIR /deploy/app

CMD node queueProcessor/queue-worker.js

