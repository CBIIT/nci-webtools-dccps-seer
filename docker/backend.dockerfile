FROM quay.io/centos/centos:stream8

RUN echo fastestmirror=1 >> /etc/dnf/dnf.conf \
    && dnf -y update \
    && dnf -y install \
    dnf-plugins-core \
    epel-release \
    glibc-langpack-en \
    && dnf config-manager --enable powertools \
    && dnf -y module enable python38 \
    && dnf -y install \
    gcc-c++ \
    make \
    httpd-devel \
    libffi-devel \
    openssl-devel \
    python38 \
    python38-devel \
    redhat-rpm-config \
    R \
    && dnf clean all

RUN mkdir -p /app/server /app/logs /app/wsgi

# install python packages
RUN pip3 install flask flask-cors mod_wsgi rpy2==3.4.5 boto3 pytest

# install renv
RUN R -e "install.packages('renv', repos = 'https://cloud.r-project.org/')"

# install R packages
COPY server/renv.lock /app/server/
COPY r-packages /app/r-packages

WORKDIR /app/server

RUN R -e "renv::restore()"

# install JPSurv
# COPY r-packages /app/r-packages
# RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

# copy server
COPY server /app/server/
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

CMD mod_wsgi-express start-server /app/server/jpsurv.wsgi \
    --user ncianalysis \
    --group ncianalysis \
    --compress-responses \
    --log-to-terminal \
    --access-log \
    --access-log-format "%h %{X-Forwarded-For}i %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined \
    --access-log-name access.log \
    --port 80 \
    --http2 \
    --server-root /app/wsgi \
    --document-root /app/server \
    --working-directory /app/server \
    --directory-index index.html \
    --mount-point /jpsurv \
    --log-directory /app/logs \
    --rotate-logs \
    --error-log-name apache.log \
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
    --processes 3 \
    --threads 1 \
    --reload-on-changes 