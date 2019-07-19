FROM centos:latest

RUN yum -y update \
 && yum -y upgrade \
 && yum -y install \
        epel-release \
 && yum -y install \
        curl-devel \
        httpd-devel \
        openssl-devel \
        python \
        python-devel \
        python-pip \
        R \
        R-devel \
        readline-devel \
 && yum clean all

RUN { \
    echo "local({"                                      ;\
    echo "    r <- getOption('repos')"                  ;\
    echo "    r['CRAN'] <- 'http://cran.rstudio.com/'"  ;\
    echo "    options(repos = r)"                       ;\
    echo "})"                                           ;\
} | tee -a "/usr/lib64/R/library/base/R/Rprofile"

RUN ln -s /usr/lib/jvm/jre/lib/amd64/server/libjvm.so /usr/lib64/libjvm.so

RUN pip install --upgrade \
        pip \
        setuptools \
 && pip install \
        flask \
        mod_wsgi \
        rpy2==2.8.6 \
        stompest \
        stompest.async \
        twisted

COPY JPSurv_2.0.32.tar.gz /tmp/jpsurv.tar.gz

RUN R -e "install.packages(c('ggplot2', 'rjson'))" \
 && R -e "install.packages('/tmp/jpsurv.tar.gz', repos = NULL)"

RUN mkdir -p /deploy/jpsurv

# ensure jpsurv code is mounted under the /app directory
# eg: docker run -it -p 9000:8000 -v $PWD/deploy/jpsurv:/app cbiitss/jpsurv
CMD mod_wsgi-express start-server /deploy/jpsurv/jpsurv.wsgi \
    --port 8000 \
    --user apache \
    --group apache \
    --document-root /deploy \
    --working-directory /deploy/jpsurv \
    --directory-index index.html \
    --processes 1 \
    --threads 1 \
    --request-timeout 900 \
    --queue-timeout 900 \
    --compress-responses \
    --mount-point /jpsurv \
    --access-log \
    --reload-on-changes \
    --log-to-terminal