source("renv/activate.R")

options(renv.config.repos.override = "https://packagemanager.posit.co/cran/__linux__/rhel9/latest")

# parallelize installation using all available cores
options(Ncpus = parallel::detectCores())
Sys.setenv(MAKEFLAGS = paste0("-j", parallel::detectCores()))
