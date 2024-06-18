FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   gcc-c++ \
   make \
   nodejs \
   npm \
   R-4.1.3 \
   tar \
   && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# Add R repo config
RUN echo '\
options(\
    repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])),\
    Ncpus = parallel::detectCores()\
)' >> /usr/lib64/R/library/base/R/Rprofile

COPY r-packages /app/r-packages
COPY server /app/server/

WORKDIR /app/server

# install R packages
RUN Rscript deps.R

# copy queue processor
COPY server/queueProcessor /app/server/queueProcessor
COPY server/templates /app/server/templates
COPY server/JPSurvWrapper.R /app/server/

WORKDIR /app/server/queueProcessor

RUN npm install

WORKDIR /app/server

CMD node queueProcessor/queue-worker.js

