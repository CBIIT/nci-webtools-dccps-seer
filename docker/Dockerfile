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
        rpy2==2.8.6

COPY jpsurv.tar.gz /tmp/jpsurv.tar.gz

RUN pushd /tmp \
 && R -e "install.packages(c(\
    'ggplot2', \
    'rjson', \
    'jpsurv.tar.gz' ))"

RUN mkdir /app

WORKDIR /deploy

# ensure jpsurv code is mounted under the /app directory
# eg: docker run -it -p 9000:8000 -v $PWD/jpsurv:/app cbiitss/jpsurv
CMD mod_wsigi-express start-server /app/jpsurv.wsgi \
    --port 8000 \
    --user apache \
    --group apache \
    --document-root /app \
    --working-directory /app \
    --directory-index index.html \
    --processes 4 \
    --threads 1 \
    --request-timeout 900 \
    --queue-timeout 900 \
    --compress-responses \
    --log-to-terminal