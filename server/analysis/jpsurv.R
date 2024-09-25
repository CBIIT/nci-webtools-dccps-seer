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
    cohortVars <- params$cohortVars
    cohortMatrix <- do.call(rbind, params$cohortCombos)
    cohortSubsets <- apply(cohortMatrix, 1, function(cohortRow) {
        cohortStr <- paste(cohortVars, cohortRow, sep = " == ", collapse = " & ")
        sprintf("%s & %s", cohortStr, yearStr)
    })
    subsets <- cohortSubsets
    # save(data, subset, file = "~/Desktop/data.RData")

    for (cohortComboIndex in 1:length(subsets)) {
        model <- joinpoint(
            data = data,
            subset = subsets[[cohortComboIndex]],
            year = params$year,
            observedrelsurv = params$observed,
            model.form = ~NULL,
            maxnum.jp = params$maxJp
        )
        save(model, file = file.path(outputFolder, sprintf("%s.RData", cohortComboIndex)))

        # for (fitIndex in 1:length(model$FitList)) {
        #     model$FitList[[fitIndex]]$trends <- aapc.multiints(model$FitList[[fitIndex]], type = "AbsChgSur", int.select = unique(model$Interval))
        # }
        write_json(as.data.frame(model$coefficients), path = file.path(outputFolder, sprintf("%s-coefficients.json", cohortComboIndex)), auto_unbox = FALSE)
        write_json(model$FitList, path = file.path(outputFolder, sprintf("%s.json", cohortComboIndex)), auto_unbox = TRUE)
    }
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

getTrends <- function() {

}
