FROM quay.io/centos/centos:stream8

RUN dnf -y update \
    && dnf -y install \
    dnf-plugins-core \
    epel-release \
    glibc-langpack-en \
    && dnf config-manager --enable powertools \
    && dnf -y install \
    gcc-c++ \
    make \
    httpd-devel \
    openssl-devel \
    R \
    python3-pip \
    python3-devel \
    && dnf clean all

# install python packages
RUN pip3 install flask mod_wsgi rpy2 boto3 pytest

# install R packages
RUN R -e "install.packages(c('ggplot2', 'rjson', 'ggrepel', 'jsonlite'), repos='https://cloud.r-project.org/')" 

# install JPSurv R package
COPY ../r-packages/JPSurv_R_package.tar.gz /tmp/jpsurv.tar.gz

RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

COPY docker/wsgi.conf /etc/httpd/conf.d/wsgi.conf

RUN mkdir -p /deploy/app /deploy/logs

COPY ../jpsurv /deploy/app/

WORKDIR /deploy/app

## building locally - need to provide aws credentials to use queue 
# docker build -t jpsurv -f docker/app.dockerfile <PATH_TO_REPO>
# docker run -d -p 8110:8000 -v <PATH_TO_REPO>/logs:/deploy/logs -v <PATH_TO_REPO>/results:/deploy/results -v <PATH_TO_REPO>/config:/deploy/config --name jpsurv-server jpsurv
# docker run -d -v <PATH_TO_REPO>/logs:/deploy/logs -v <PATH_TO_REPO>/results:/deploy/results -v <PATH_TO_REPO>/config:/deploy/config --name jpsurv-processor jpsurv python3 jpsurvProcessor.py

CMD mod_wsgi-express start-server /deploy/app/jpsurv.wsgi \
    --port 8000 \
    --user apache \
    --group apache \
    --document-root /deploy/app \
    --working-directory /deploy/app \
    --directory-index index.html \
    --processes 3 \
    --threads 1 \
    --initial-workers 1 \
    --request-timeout 900 \
    --queue-timeout 900 \
    --connect-timeout 900 \
    --compress-responses \
    --log-to-terminal \
    --include-file /etc/httpd/conf.d/wsgi.conf