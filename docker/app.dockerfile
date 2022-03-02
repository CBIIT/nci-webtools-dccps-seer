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

# install JPSurv R package
COPY r-packages/JPSurv_R_package.tar.gz /tmp/jpsurv.tar.gz

# install renv
RUN Rscript -e "install.packages('renv', repos = 'https://cloud.r-project.org/')"

# install R packages
COPY /jpsurv/renv.lock /deploy/app/

WORKDIR /deploy/app

RUN Rscript -e "renv::restore()"

RUN R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

RUN mkdir -p /deploy/app /deploy/logs /deploy/wsgi

COPY jpsurv /deploy/app/
COPY jpsurv /deploy/app/jpsurv
COPY docker/additional-configuration.conf /deploy/wsgi/additional-configuration.conf

# create ncianalysis user
RUN groupadd -g 4004 -o ncianalysis \
    && useradd -m -u 4004 -g 4004 -o -s /bin/bash ncianalysis
RUN chown -R ncianalysis:ncianalysis /deploy
# USER ncianalysis

## building locally - need to provide aws credentials to use queue 
# docker build -t jpsurv -f docker/app.dockerfile ~/Projects/jpsurv
# docker run -d -p 8110:80 -v ~/Projects/jpsurv/logs:/deploy/logs -v ~/Projects/jpsurv/tmp:/deploy/tmp -v ~/Projects/jpsurv/config:/deploy/config --name jpsurv-server jpsurv
# docker run -d -v ~/Projects/jpsurv/logs:/deploy/logs -v ~/Projects/jpsurv/tmp:/deploy/tmp -v ~/Projects/jpsurv/config:/deploy/config --name jpsurv-processor jpsurv python3 jpsurvProcessor.py

CMD mod_wsgi-express start-server /deploy/app/jpsurv.wsgi \
    --user ncianalysis \
    --group ncianalysis \
    --compress-responses \
    --log-to-terminal \
    --access-log \
    --access-log-format "%h %{X-Forwarded-For}i %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\"" combined \
    --access-log-name access.log \
    --port 80 \
    --server-root /deploy/wsgi \
    --document-root /deploy/app \
    --working-directory /deploy/app \
    --directory-index index.html \
    --mount-point /jpsurv \
    --log-directory /deploy/logs \
    --rotate-logs \
    --error-log-name apache.log \
    --include-file /deploy/wsgi/additional-configuration.conf \
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
    --keep-alive-timeout 61 \
    --processes 3 \
    --threads 1 \
    --reload-on-changes 