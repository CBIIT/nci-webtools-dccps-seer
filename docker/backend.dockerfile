FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
    && dnf -y install \
    gcc-c++ \
    httpd-devel \
    libffi-devel \
    make \
    openssl-devel \
    python3 \
    python3-devel \    
    python3-pip \
    python3-setuptools \
    python3-wheel \
    R-4.1.3 \
    rsync \
    && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# install python packages
RUN pip3 install flask==2.0.3 Werkzeug==2.0.3 flask-cors mod_wsgi rpy2==3.4.5 boto3 pytest

# install R packages with renv
COPY server/renv.lock /app/server/
COPY server/.Rprofile /app/server/
COPY server/renv/activate.R /app/server/renv/
COPY server/renv/settings.dcf /app/server/renv/
COPY r-packages /app/r-packages

# copy renv cache if available
ENV RENV_PATHS_CACHE=/app/server/renv/cache
RUN mkdir ${RENV_PATHS_CACHE}
ARG RENV_CACHE_HOST=/renvCach[e]
COPY ${RENV_CACHE_HOST} ${RENV_PATHS_CACHE}
WORKDIR /app/server
RUN R -e "options(Ncpus=parallel::detectCores()); renv::restore()"

# install JPSurv
# RUN R -e "renv::install('/app/r-packages/JPSurv_R_package.tar.gz')"

# copy server folder, ignore renv folder
COPY server/[^renv]* /app/server/

# copy client to static directory
COPY server /app/server/jpsurv
# copy additional wsgi config
COPY docker/additional-configuration.conf /app/wsgi/additional-configuration.conf

# create ncianalysis user
RUN groupadd -g 4004 -o ncianalysis \
    && useradd -m -u 4004 -g 4004 -o -s /bin/bash ncianalysis
RUN chown -R ncianalysis:ncianalysis /app
# USER ncianalysis

## building locally - need to provide aws credentials to use queue 
# docker build -t jpsurv -f docker/server.dockerfile ~/Projects/jpsurv
# docker run -d -p 8110:80 -v ~/Projects/jpsurv/logs:/app/logs -v ~/Projects/jpsurv/tmp:/app/tmp -v ~/Projects/jpsurv/config:/app/config --name jpsurv-server jpsurv
# docker run -d -v ~/Projects/jpsurv/logs:/app/logs -v ~/Projects/jpsurv/tmp:/app/tmp -v ~/Projects/jpsurv/config:/app/config --name jpsurv-processor jpsurv python3 jpsurvProcessor.py

# CMD R -e "renv::repair()" && mod_wsgi-express start-server /app/server/jpsurv.wsgi \
CMD mod_wsgi-express start-server /app/server/jpsurv.wsgi \
    --user ncianalysis \
    --group ncianalysis \
    --compress-responses \
    --log-to-terminal \
    --access-log \
    --access-log-format "%h %{X-Forwarded-For}i %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined \
    # --access-log-name access.log \
    --port 80 \
    --server-root /app/wsgi \
    --document-root /app/server \
    --working-directory /app/server \
    --directory-index index.html \
    --mount-point /jpsurv \
    # --log-directory /app/logs \
    # --rotate-logs \
    # --error-log-name apache.log \
    --include-file /app/wsgi/additional-configuration.conf \
    --header-buffer-size 50000000 \
    --response-buffer-size 50000000 \
    --limit-request-body 5368709120 \
    --initial-workers 1 \
    --socket-timeout 900 \
    --queue-timeout 900 \
    --shutdown-timeout 900 \
    --graceful-timeout 900 \
    --connect-timeout 900 \
    --request-timeout 900 \
    --keep-alive-timeout 60 \
    # --max-clients 200 \
    # --processes 3 \
    # --threads 1 \
    --reload-on-changes 