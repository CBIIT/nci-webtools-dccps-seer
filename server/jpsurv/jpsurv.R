library(jsonlite)

calculateJoinpoint <- function(inputFolder, outputFolder) {
    library(JPSurv)
    library(dplyr)
    params <- read_json(file.path(inputFolder, "params.json"))

    data <- read_json(file.path(inputFolder, params$files$seerStatFile), simplifyDataFrame = T)
    # filter data up to selected interval
    data <- subset(data$seerStatData, Interval <= params$interval)
    if (params$rates == "Percents") {
        data <- toProportion(data)
    }

    # subset strings for filtering data
    yearStr <- sprintf("%s >= %s & %s <= %s", params$year, params$yearStart, params$year, params$yearEnd)
    cohortVars <- params$cohortVars
    cohortMatrix <- do.call(rbind, params$cohortCombos)
    cohortSubsets <- apply(cohortMatrix, 1, function(cohortRow) {
        if (length(cohortRow) > 0) {
            cohortStr <- paste(cohortVars, cohortRow, sep = " == ", collapse = " & ")
            sprintf("%s & %s", cohortStr, yearStr)
        } else {
            yearStr
        }
    })

    manifest <- lapply(seq_along(cohortSubsets), function(cohortComboIndex) {
        tryCatch(
            {
                model <- NULL
                if (params$useCondModel) {
                    model <- joinpoint.cond(
                        data = data,
                        subset = cohortSubsets[[cohortComboIndex]],
                        start.interval = params$conditionalStart,
                        end.interval = params$conditionalEnd,
                        year = params$year,
                        model.form = ~NULL,
                        delLastIntvl = params$delLastIntvl,
                        maxnum.jp = params$maxJp,
                        proj.year.num = params$projectedYears,
                        op = list("numbetwn" = params$numbetwn, "numfromstart" = params$numfromstart, "numtoend" = params$numtoend)
                    )
                } else if (params$useRelaxModel) {
                    model <- joinpoint.relaxProp(
                        data = data,
                        subset = cohortSubsets[[cohortComboIndex]],
                        max.cutpoint = params$cutpoint,
                        year = params$year, model.form = ~NULL,
                        delLastIntvl = params$delLastIntvl,
                        maxnum.jp = params$maxJp,
                        proj.year.num = params$projectedYears,
                        op = list("numbetwn" = params$numbetwn, "numfromstart" = params$numfromstart, "numtoend" = params$numtoend)
                    )
                } else { # calculate unconditional model
                    model <- joinpoint(
                        data = data,
                        subset = cohortSubsets[[cohortComboIndex]],
                        year = params$year,
                        observedrelsurv = params$observed,
                        model.form = ~NULL,
                        maxnum.jp = params$maxJp,
                        delLastIntvl = params$delLastIntvl,
                        proj.year.num = params$projectedYears,
                        op = list("numbetwn" = params$numbetwn, "numfromstart" = params$numfromstart, "numtoend" = params$numtoend)
                    )
                }
                save(model, file = file.path(outputFolder, sprintf("%s.RData", cohortComboIndex)))

                if (params$useRelaxModel) {
                    fitInfo <- model$fit.info
                    optimalCutpointIndex <- which(fitInfo[["BestFit(Min BIC)"]] == "*")

                    lapply(seq_along(model$all.results), function(cpIndex) {
                        uncond <- model$all.results[[cpIndex]]$fit.uncond
                        cond <- model$all.results[[cpIndex]]$fit.cond
                        # filenames
                        coefFile <- sprintf("%s-%s-coefficients.json", cohortComboIndex, cpIndex)
                        condCoefFile <- sprintf("cond-%s-%s-coefficients.json", cohortComboIndex, cpIndex)
                        modelFile <- sprintf("%s-%s.json", cohortComboIndex, cpIndex)
                        condModelFile <- sprintf("cond-%s-%s.json", cohortComboIndex, cpIndex)


                        # merge input and fit data
                        for (fitIndex in seq_along(uncond$FitList)) {
                            uncond$FitList[[fitIndex]]$fullpredicted <- download.data(
                                input = data,
                                fit = uncond,
                                nJP = fitIndex - 1,
                                yearvar = params$year,
                                downloadtype = "full",
                                subset = cohortSubsets[[cohortComboIndex]]
                            )
                        }
                        if (!is.null(cond)) {
                            for (fitIndex in seq_along(cond$FitList)) {
                                cond$FitList[[fitIndex]]$fullpredicted <- download.data(
                                    input = data,
                                    fit = cond,
                                    nJP = params$maxJp,
                                    yearvar = params$year,
                                    downloadtype = "full",
                                    subset = cohortSubsets[[cohortComboIndex]]
                                )
                            }
                        }

                        # save model coefficients to a separate file to preserve data structure
                        coef <- getModelCoefficients(uncond)
                        write_json(coef, path = file.path(outputFolder, coefFile), auto_unbox = TRUE)
                        if (!is.null(cond)) {
                            coef <- getModelCoefficients(cond)
                            write_json(coef, path = file.path(outputFolder, condCoefFile), auto_unbox = TRUE)
                        }


                        # convert values to conditional
                        for (fitIndex in seq_along(uncond$FitList)) {
                            uncond$FitList[[fitIndex]]$fullpredicted <- getConditionalValues(uncond$FitList[[fitIndex]]$fullpredicted, params$year, TRUE)
                        }
                        if (!is.null(cond)) {
                            for (fitIndex in seq_along(cond$FitList)) {
                                cond$FitList[[fitIndex]]$fullpredicted <- getConditionalValues(cond$FitList[[fitIndex]]$fullpredicted, params$year, TRUE)
                            }
                        }

                        # relabel cohorts
                        uncond$FitList <- relabelData(uncond$FitList, params)

                        # save results to file
                        write_json(uncond$FitList, path = file.path(outputFolder, modelFile), auto_unbox = TRUE)
                        if (!is.null(cond)) {
                            cond$FitList <- relabelData(cond$FitList, params)
                            write_json(cond$FitList, path = file.path(outputFolder, condModelFile), auto_unbox = TRUE)
                        }

                        list(
                            "coefficients" = coefFile,
                            "cond_coefficients" = if (!is.null(cond)) condCoefFile else NULL,
                            "model" = modelFile,
                            "cond_model" = if (!is.null(cond)) condModelFile else NULL,
                            "cohort_index" = cohortComboIndex,
                            "cutpoint_index" = cpIndex,
                            "optimal_cutpoint" = optimalCutpointIndex == cpIndex,
                            "cohort" = cohortSubsets[[cohortComboIndex]],
                            "final_model_index" = length(uncond$jp),
                            "cond_final_model_index" = if (!is.null(cond)) length(cond$jp) else NULL
                        )
                    })
                } else {
                    # filenames
                    coefFile <- sprintf("%s-coefficients.json", cohortComboIndex)
                    modelFile <- sprintf("%s.json", cohortComboIndex)

                    # merge input and fit data
                    for (fitIndex in seq_along(model$FitList)) {
                        fit <- model$FitList[[fitIndex]]
                        model$FitList[[fitIndex]]$fullpredicted <- download.data(
                            input = data,
                            fit = model,
                            nJP = fitIndex - 1,
                            yearvar = params$year,
                            downloadtype = "full",
                            subset = cohortSubsets[[cohortComboIndex]]
                        )
                    }

                    # save model coefficients to a separate file to preserve data structure
                    coef <- getModelCoefficients(model)
                    write_json(coef, path = file.path(outputFolder, coefFile), auto_unbox = TRUE)

                    # convert values to conditional
                    if (params$useCondModel || params$useRelaxModel) {
                        for (fitIndex in 1:length(model$FitList)) {
                            data <- model$FitList[[fitIndex]]$fullpredicted
                            model$FitList[[fitIndex]]$fullpredicted <- getConditionalValues(data, params$year, params$useRelaxModel)
                        }
                    }

                    # relabel cohorts
                    model$FitList <- relabelData(model$FitList, params)

                    # save results to file
                    write_json(model$FitList, path = file.path(outputFolder, modelFile), auto_unbox = TRUE)

                    list(
                        "coefficients" = coefFile,
                        "model" = modelFile,
                        "cohort_index" = cohortComboIndex,
                        "cohort" = cohortSubsets[[cohortComboIndex]],
                        "final_model_index" = length(model$jp)
                    )
                }
            },
            error = function(e) {
                save(e, file = file.path(outputFolder, sprintf("error-%s.RData", cohortComboIndex)))
                e$message
                # capture.output(traceback(e))
            }
        )
    })
    if (params$useRelaxModel) manifest <- flatten_list(manifest)
    save(manifest, file = file.path(outputFolder, "manifest.RData"))
    write_json(manifest, path = file.path(outputFolder, "manifest.json"), auto_unbox = TRUE)
}

# scale data from whole numbers to proportional percentage value
toProportion <- function(data) {
    columns <- c(
        "Observed_Survival_Cum",
        "Observed_Survival_Interval",
        "Expected_Survival_Interval",
        "Expected_Survival_Cum",
        "Relative_Survival_Interval",
        "Relative_Survival_Cum",
        "Observed_SE_Interval",
        "Observed_SE_Cum",
        "Relative_SE_Interval",
        "Relative_SE_Cum",
        "CauseSpecific_Survival_Interval",
        "CauseSpecific_Survival_Cum",
        "CauseSpecific_SE_Interval",
        "CauseSpecific_SE_Cum",
        "Predicted_Survival_Int",
        "Predicted_ProbDeath_Int",
        "Predicted_Survival_Cum",
        "Predicted_Survival_Int_SE",
        "Predicted_ProbDeath_Int_SE",
        "Predicted_Survival_Cum_SE",
        "pred_cum",
        "pred_cum_se",
        "pred_int",
        "pred_int_se",
        "observed",
        "observed_se"
    )
    for (col in columns) {
        if (!is.null(data[[col]])) {
            data[[col]] <- data[[col]] / 100
        }
    }
    data
}

joinpointConditional <- function(params, outputFolder) {
    library(JPSurv)
    # load previous calculated model
    load(file.path(outputFolder, paste0(params$cohortIndex, ".RData")))
    conditionalModel <- joinpoint.conditional(model, params$conditionalIntervals$start, params$conditionalIntervals$end, params$fitIndex)

    # Transform observed cumulative data to be conditional
    year <- colnames(conditionalModel)[[1]]
    observed <- NULL
    observed_se <- NULL
    n_year <- length(unique(conditionalModel[[1]]))
    year_uniq <- sort(unique(conditionalModel[[1]]))
    for (i in 1:n_year) {
        dat.i <- conditionalModel[conditionalModel[[year]] == year_uniq[i], ]
        cond_surv.i <- cumprod(dat.i$Relative_Survival_Interval)
        observed <- c(observed, cond_surv.i)

        dat.i$risk <- dat.i$Alive_at_Start - 0.5 * dat.i$Lost_to_Followup
        observed_se <- c(observed_se, cumprod(dat.i$Relative_Survival_Interval) * sqrt(cumsum(dat.i$Died / (dat.i$risk * (dat.i$risk - dat.i$Died)))))
    }
    conditionalModel$observed <- observed
    conditionalModel$observed_se <- observed_se
    conditionalModel
}


getConditionalValues <- function(data, yearCol, conditionalPredicted = FALSE) {
    n_year <- length(unique(data[[yearCol]]))
    year_uniq <- sort(unique(data[[yearCol]]))
    rel_surv_cum <- NULL
    pred_rel_surv_cum <- NULL

    for (i in 1:n_year) {
        dat.i <- data[data[[yearCol]] == year_uniq[i], ]
        cum_surv.i <- cumprod(dat.i$Relative_Survival_Interval)
        pred_cum_surv.i <- cumprod(dat.i$Predicted_Survival_Int)
        rel_surv_cum <- c(rel_surv_cum, cum_surv.i)
        pred_rel_surv_cum <- c(pred_rel_surv_cum, pred_cum_surv.i)
    }

    data$Relative_Survival_Cum <- rel_surv_cum
    if (conditionalPredicted) data$Predicted_Survival_Cum <- pred_rel_surv_cum
    data
}

# get model coefficients
getModelCoefficients <- function(model) {
    coef <- c()
    for (fit in model$FitList) {
        coef[[length(coef) + 1]] <- as.data.frame(fit$coefficients)
    }
    coef
}

flatten_list <- function(x) {
    if (!is.list(x)) {
        return(list(x))
    }
    do.call(c, x)
}

# apply cohort and year labels to data
relabelData <- function(FitList, params) {
    lapply(FitList, function(fit) {
        data <- fit$fullpredicted
        for (cohort in params$cohorts) {
            data[[cohort$name]] <- sapply(data[[cohort$name]], function(value) {
                label <- Filter(function(e) e$value == value, cohort$options)
                if (length(label) > 0) label[[1]]$label else value
            })
        }
        data[[params$year]] <- data[[params$year]] + params$firstYear
        fit$fullpredicted <- data
        fit
    })
}

joinpointTrends <- function(params, outputFolder) {
    library(JPSurv)
    load(file.path(outputFolder, paste0(params$cohortIndex, ".RData")))
    trends <- lapply(model$FitList, function(fit) {
        if (params$type == "surv") {
            survTrend <- aapc.multiints(fit, type = "AbsChgSur", int.select = unique(fit$predicted$Interval))
            list("survTrend" = survTrend)
        } else if (params$type == "death") {
            deathTrend <- aapc.multiints(fit, type = "RelChgHaz", int.select = unique(fit$predicted$Interval))
            list("deathTrend" = deathTrend)
        }
    })
    trends
}

# get surv-year trends for specific calendar years
calendarTrends <- function(params, outputFolder) {
    library(JPSurv)
    # load previous calculated model
    load(file.path(outputFolder, paste0(params$cohortIndex, ".RData")))
    trends <- list()
    if (params$useRelaxModel) {
        for (cutpoint in 1:length(model$all.results)) {
            uncond <- model$all.results[[cutpoint]]$fit.uncond
            cond <- model$all.results[[cutpoint]]$fit.cond
            trends$uncond[[cutpoint]] <- aapc.multiints(uncond, type = "AbsChgSur", int.select = unique(uncond$predicted$Interval), ACS.range = unlist(params$yearRange), ACS.out = "user")
            if (!is.null(cond)) {
                trends$cond[[cutpoint]] <- aapc.multiints(cond, type = "AbsChgSur", int.select = unique(cond$predicted$Interval), ACS.range = unlist(params$yearRange), ACS.out = "user")
            }
        }
    } else {
        for (fitIndex in 1:length(model$FitList)) {
            fit <- model$FitList[[fitIndex]]
            range <- unlist(params$yearRange)
            trends[[fitIndex]] <- aapc.multiints(fit, type = "AbsChgSur", int.select = unique(fit$predicted$Interval), ACS.range = unlist(params$yearRange), ACS.out = "user")
        }
    }
    trends
}

# calculate jp, calendar, or both trends
getTrends <- function(params, outputFolder) {
    data <- list()
    if (params$jpTrend) {
        data$jpTrend <- joinpointTrends(params, outputFolder)
    }
    if (!is.null(params$calendarTrend) && params$calendarTrend) {
        data$calendarTrend <- calendarTrends(params, outputFolder)
    }
    data
}
