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
COPY server/requirements.txt /app/server/
COPY server/deps.R /app/server/

WORKDIR /app/server

# install python packages
RUN pip3 install -r requirements.txt

# install R packages
RUN Rscript deps.R

# copy rest of server
COPY server /app/server/
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