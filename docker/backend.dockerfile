FROM public.ecr.aws/amazonlinux/amazonlinux:2023

RUN dnf -y update \
    && dnf -y install \
    nodejs20 \
    nodejs20-npm  \
    tar \ 
    R-4.3.2 \
    gzip \
    && dnf clean all

RUN ln -s -f /usr/bin/node-20 /usr/bin/node; ln -s -f /usr/bin/npm-20 /usr/bin/npm;
RUN mkdir -p /app/server

# Add R repo config
RUN echo '\
    options(\
    repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest"),\
    HTTPUserAgent = sprintf("R/%s R (%s)", getRversion(), paste(getRversion(), R.version["platform"], R.version["arch"], R.version["os"])),\
    Ncpus = parallel::detectCores()\
    )' >> /usr/lib64/R/library/base/R/Rprofile

COPY r-packages /app/r-packages

WORKDIR /app/server

COPY server/deps.R ./

# install R packages
RUN Rscript deps.R

COPY server/package.json server/package-lock.json ./

RUN npm install

COPY server /app/server/

# Create ENV file if it doesn't exist https://github.com/nodejs/node/issues/50993
RUN touch .env

CMD npm start