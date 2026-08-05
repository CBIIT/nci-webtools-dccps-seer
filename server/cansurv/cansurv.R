library(jsonlite)
library(dplyr)
library(flexsurv)
library(stats4)
source("cansurv/source.R")

calculateCanSurv <- function(inputFolder, outputFolder) {
    params <- read_json(file.path(inputFolder, "params.json"))
    data <- read_json(file.path(inputFolder, "data.json"), simplifyDataFrame = T)
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
            parseResults <- list(
                fit.list = parseFitList(results$fit.list),
                var.map = results$var.map,
                fit.list.by = results$fit.list.by
            )
            write_json(parseResults, path = file.path(outputFolder, "results.json"), auto_unbox = TRUE, digits = NA)
            list(data = "results.json")
        },
        error = function(e) {
            save(e, file = file.path(outputFolder, "error.RData"))
            e$message
        }
    )
    save(manifest, file = file.path(outputFolder, "manifest.RData"))
    write_json(manifest, path = file.path(outputFolder, "manifest.json"), auto_unbox = TRUE, digits = NA)
}

parseFitList <- function(fit.list) {
    lapply(fit.list, function(data) {
        converged <- isTRUE(data$fitlist$converged)
        list(
            fitlist = list(
                fit = if (converged) parseMleObject(data$fitlist$fit) else NULL,
                converged = data$fitlist$converged,
                message = data$fitlist$message,
                init.estimates = data$fitlist$init.estimates,
                init.loglike = data$fitlist$init.loglike,
                estimates = if (converged) {
                    data$fitlist$estimates %>%
                        as.data.frame() %>%
                        tibble::rownames_to_column(var = "parameter")
                } else {
                    NULL
                },
                loglike = if (converged) as.numeric(logLik(data$fitlist$loglike)) else NULL,
                vcov = data$fitlist$vcov
            ),
            obj = data$obj,
            data = data$data,
            profileLL = if (converged) getProfileLoglike(data, lower = 0, upper = 1, step = 0.1) else NULL
        )
    })
}

parseMleObject <- function(mleObj) {
    if (!isS4(mleObj) || !methods::is(mleObj, "mle")) {
        return(NULL)
    }
    list(
        call = as.character(mleObj@call),
        coef = coef(mleObj),
        vcov = vcov(mleObj),
        logLik = as.numeric(logLik(mleObj)),
        nobs = nobs(mleObj)
    )
}
