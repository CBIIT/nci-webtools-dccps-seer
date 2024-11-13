library(jsonlite)
library(dplyr)
source("cansurv/source.R")

calculateCanSurv <- function(inputFolder, outputFolder) {
    params <- read_json(file.path(inputFolder, "params.json"))
    data <- read_json(file.path(inputFolder, params$files$seerStatFile), simplifyDataFrame = T)
    data <- bind_rows(data$seerStatData)

    manifest <- tryCatch(
        {
            results <- CanSurv(data,
                dist = params$dist,
                cure = params$cure, mu = params$mu, sigma = params$sigma,
                continuous = params$continuous, by = params$by,
                time = params$time, alive = params$alive, died = params$died,
                lost = params$lost, exp_cum = params$exp_cum,
                rel_cum = params$rel_cum,
                est_cure = params$est_cure,
                n_restart_conv = params$n_restart_conv, seed = params$seed, maxit = params$maxit,
                reltol = params$reltol
            )

            resultsFile <- "results.json"
            write_json(results, path = file.path(outputFolder, resultsFile), auto_unbox = TRUE)
            manifest$results <- resultsFile
            resultsFile
        },
        error = function(e) {
            save(e, file = file.path(outputFolder, "error.RData"))
            e$message
        }
    )
    save(manifest, file = file.path(outputFolder, "manifest.RData"))
    write_json(manifest, path = file.path(outputFolder, "manifest.json"), auto_unbox = TRUE)
}
