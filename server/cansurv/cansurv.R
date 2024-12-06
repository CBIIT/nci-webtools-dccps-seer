library(jsonlite)
library(dplyr)
library(flexsurv)
library(stats4)
source("cansurv/source.R")

calculateCanSurv <- function(inputFolder, outputFolder) {
    params <- read_json(file.path(inputFolder, "params.json"))
    data <- read_json(file.path(inputFolder, params$files$seerStatFile), simplifyDataFrame = T)
    data <- bind_rows(data$seerStatData)

    manifest <- tryCatch(
        {
            results <- CanSurv(data,
                dist = params$dist,
                cure = unlist(params$cure),
                mu = unlist(params$mu),
                sigma = unlist(params$sigma),
                continuous = unlist(params$continuous),
                by = unlist(params$by),
                time = params$time, alive = params$alive, died = params$died,
                lost = params$lost, exp_cum = params$exp_cum,
                rel_cum = params$rel_cum,
                est_cure = params$est_cure,
                n_restart_conv = params$n_restart_conv, seed = params$seed, maxit = params$maxit,
                reltol = params$reltol
            )
            save(results, file = file.path(outputFolder, "results.RData"))
            fit <- results$fit.list[[1]]$fit
            fit_summary <- summary(fit)
            parseResults <- list(
                converged = results$fit.list[[1]]$converged,
                init.estimates = results$fit.list[[1]]$init.estimates,
                init.loglike = results$fit.list[[1]]$init.loglike,
                estimates = results$fit.list[[1]]$estimates,
                loglike = toString(results$fit.list[[1]]$loglike),
                vcov = results$fit.list[[1]]$vcov
            )
            write_json(parseResults, path = file.path(outputFolder, "results.json"), auto_unbox = TRUE)
            "results.json"
        },
        error = function(e) {
            save(e, file = file.path(outputFolder, "error.RData"))
            e$message
        }
    )
    save(manifest, file = file.path(outputFolder, "manifest.RData"))
    write_json(manifest, path = file.path(outputFolder, "manifest.json"), auto_unbox = TRUE)
}
