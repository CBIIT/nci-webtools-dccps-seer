library(jsonlite)

calculateJoinpoint <- function(inputFolder, outputFolder) {
    library(JPSurv)
    library(dplyr)
    params <- read_json(file.path(inputFolder, "params.json"))

    # read data
    dataFile <- file.path(inputFolder, params$files$dataFile)
    data2 <- read.table(dataFile, header = FALSE, fill = TRUE, na.strings = ".")
    names(data2) <- params$files$headers


    data <- read_json(file.path(inputFolder, params$files$seerStatDataFile), simplifyDataFrame = T)


    # subset strings for filtering
    yearStr <- sprintf("%s >= %s & %s <= %s", params$year, params$yearStart, params$year, params$yearEnd)
    cohortVars <- names(params$cohorts)
    cohortMatrix <- c()
    for (i in seq_along(params$cohorts)) {
        cohortMatrix[[i]] <- unlist(params$cohorts[[i]])
    }
    cohortMatrix <- as.matrix(expand.grid(cohortMatrix))
    cohortSubsets <- apply(cohortMatrix, 1, function(cohortRow) {
        cohortStr = paste(cohortVars, cohortRow, sep = " == ", collapse = " & ")
        sprintf("%s & %s", cohortStr, yearStr)
    })
    subsets <- cohortSubsets
    subset <- subsets[1]
    save(data,subset, file = "~/Desktop/data.RData")


    jp <- joinpoint(
        data = subset(data, Interval <= params$interval),
        subset = subset,
        year = params$year,
        maxnum.jp = params$maxJp,
        observedrelsurv = params$observed,
        model.form = ~NULL,
    )

    return(jp)
}
