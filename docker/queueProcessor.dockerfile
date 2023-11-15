FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
   && dnf -y install \
   gcc-c++ \
   make \
   nodejs \
   npm \
   R-4.1.3 \
   rsync \
   && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# install R packages with renv
COPY server/renv.lock /app/server/
COPY server/.Rprofile /app/server/
COPY server/renv/activate.R /app/server/renv/
COPY server/renv/settings.dcf /app/server/renv/
COPY r-packages /app/r-packages

# copy renv cache if available
ENV RENV_PATHS_CACHE=/app/server/renv/cache
RUN mkdir ${RENV_PATHS_CACHE}
ARG R_RENV_CACHE_HOST=/renvCach[e]
COPY ${R_RENV_CACHE_HOST} ${RENV_PATHS_CACHE}
WORKDIR /app/server
RUN R -e "options(Ncpus=parallel::detectCores()); renv::restore()"

# install JPSurv
# COPY r-packages /app/r-packages
# RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

# copy queue processor
COPY server/queueProcessor /app/server/queueProcessor
COPY server/templates /app/server/templates
COPY server/JPSurvWrapper.R /app/server/

WORKDIR /app/server/queueProcessor

RUN npm install

WORKDIR /app/server

CMD node queueProcessor/queue-worker.js

