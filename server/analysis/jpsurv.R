library(jsonlite)

calculateJoinpoint <- function(inputFolder, outputFolder) {
    library(JPSurv)
    library(dplyr)
    params <- read_json(file.path(inputFolder, "params.json"))

    # read data
    # dataFile <- file.path(inputFolder, params$files$dataFile)
    # data2 <- read.table(dataFile, header = FALSE, fill = TRUE, na.strings = ".")
    # names(data2) <- params$files$headers
    data <- read_json(file.path(inputFolder, params$files$seerStatFile), simplifyDataFrame = T)
    data <- subset(data$seerStatData, Interval <= params$interval)
    if (params$rates == "Percents") {
        data <- toProportion(data)
    }

    # subset strings for filtering
    yearStr <- sprintf("%s >= %s & %s <= %s", params$year, params$yearStart, params$year, params$yearEnd)
    cohortVars <- names(params$selectedCohorts)
    cohortMatrix <- c()
    for (i in seq_along(params$selectedCohorts)) {
        cohortMatrix[[i]] <- unlist(params$selectedCohorts[[i]])
    }
    cohortMatrix <- as.matrix(expand.grid(cohortMatrix))
    cohortSubsets <- apply(cohortMatrix, 1, function(cohortRow) {
        cohortStr <- paste(cohortVars, cohortRow, sep = " == ", collapse = " & ")
        sprintf("%s & %s", cohortStr, yearStr)
    })
    subsets <- cohortSubsets
    subset <- subsets[1]
    save(data, subset, file = "~/Desktop/data.RData")


    results <- joinpoint(
        data = data,
        subset = subset,
        year = params$year,
        observedrelsurv = params$observed,
        model.form = ~NULL,
        maxnum.jp = params$maxJp
    )

    save(results, file = "~/Desktop/results.RData")
    write_json(results$FitList, path = file.path(outputFolder, "results.json"), pretty = TRUE, auto_unbox = TRUE)
    results
}

#
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
        "observed"
    )
    for (col in columns) {
        if (!is.null(data[[col]])) {
            data[[col]] <- data[[col]] / 100
        }
    }
    data
}
