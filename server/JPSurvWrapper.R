library(rjson)
library(jsonlite)
library(JPSurv)
library(ggplot2)
library(ggrepel)

VERBOSE <- TRUE

getDictionary <- function(inputFile, path, tokenId) {
  fqFileName <- file.path(path, inputFile)
  outputFileName <- paste("form-", tokenId, ".json", sep = "")
  fqOutputFileName <- file.path(path, outputFileName)
  seerFormData <- dictionary.overview(fqFileName)
  cat(rjson::toJSON(seerFormData), file = fqOutputFileName)
  return(tokenId)
}

ReadCSVFile <- function(inputFile, path, tokenId, jpsurvDataString, input_type) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  fqFileName <- file.path(path, inputFile)
  file_name <- paste(jpsurvData$tokenId, fqFileName, sep = "")
  outputFileName <- paste("form-", tokenId, ".json", sep = "")
  fqOutputFileName <- file.path(path, outputFileName)
  # Reading mapped paramteres by user
  has_headers <- as.logical(jpsurvData$mapping$has_headers)
  cohorts <- jpsurvData$mapping$cohorts
  year <- jpsurvData$mapping$year
  interval <- jpsurvData$mapping$interval
  del <- jpsurvData$additional$del
  rates <- jpsurvData$additional$rates
  alive_at_start <- jpsurvData$mapping$alive_at_start
  lost_to_followup <- jpsurvData$mapping$lost_to_followup
  exp_int <- jpsurvData$mapping$exp_int
  observed <- jpsurvData$mapping$observed
  died <- jpsurvData$mapping$died
  statistic <- jpsurvData$additional$statistic
  # If delimter is a space or tab change it to ""
  if (del == "\t" || del == " ") {
    del <- ""
  }

  tryCatch(
    {
      csvdata <- read.table(file.path(path, inputFile), header = TRUE, sep = del, check.names = FALSE)
    },
    error = function(e) {
      stop(paste0("CSV error: ", e))
    }
  )
  dictionaryCols <- c()
  if (length(cohorts) > 0) {
    dictionaryCols <- c(cohorts, year, interval)
  } else {
    dictionaryCols <- c(year, interval)
  }

  write.tabledic <- function(inputData, idCols = c()) {
    csvDic <- list()
    idColNum <- length(idCols)
    for (Index in 1:idColNum) {
      csvDic[[Index]] <- unique(inputData[, idCols[Index]])
      names(csvDic)[Index] <- idCols[Index]
    }
    return(csvDic)
  }

  # inputData: Input data.frame.
  # idColNum: Integer value defining how many leading columns to create a dictionary of possible values from. Default is 1.
  seerFormData <- write.tabledic(inputData = csvdata, idCols = dictionaryCols)

  interval_name <- names(csvdata)[interval]
  if (length(cohorts) > 0) {
    cohort_name <- names(csvdata)[cohorts]
  } else {
    cohort_name <- list()
  }
  if (length(cohorts) == 1) {
    cohort_name <- list(cohort_name)
    cohorts <- list(cohorts)
  }
  year_name <- names(csvdata)[year]
  jsonl <- list("data" = seerFormData, "cohort_names" = cohort_name, "cohort_keys" = cohorts, "year" = c(year_name, year), "interval" = c(interval_name, interval), "input_type" = input_type, "statistic" = statistic, "alive_at_start" = alive_at_start, "lost_to_followup" = lost_to_followup, "exp_int" = exp_int, "observed" = observed, "died" = died, "has_headers" = has_headers, "del" = del, "rates" = rates)
  exportJson <- rjson::toJSON(jsonl)
  write(exportJson, fqOutputFileName)
  return(tokenId)
}

# Creates the subset expression for fitted result
getSubsetStr <- function(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues) {
  yearOfDiagnosisVarName <- paste0("`", getCorrectFormat(yearOfDiagnosisVarName), "`")
  startYearStr <- paste(yearOfDiagnosisVarName, ">=", yearOfDiagnosisRange[1])
  endYearStr <- paste(yearOfDiagnosisVarName, "<=", yearOfDiagnosisRange[2])
  yearStr <- paste(startYearStr, endYearStr, sep = " & ")
  params <- c()
  if (length(cohortVars) > 0) {
    for (i in 1:length(cohortValues)) {
      if (cohortValues[i] != "\"\"") {
        cohortVars <- paste0("`", getCorrectFormat(cohortVars), "`")
        params <- c(params, paste(cohortVars[i], cohortValues[i], sep = "=="))
      }
    }
  }
  if (length(params) > 0) {
    params <- paste(params, collapse = " & ")
    return(paste(params, yearStr, sep = " & "))
  } else {
    return(yearStr)
  }
}

# Creates the model.form expression for fitted result
getFactorStr <- function(covariateVars) {
  factorStr <- ""
  if (nchar(covariateVars) != 0) {
    covariateVars <- paste0("`", getCorrectFormat(covariateVars), "`")
    factorStr <- paste("~-1+", paste(gsub("$", ")", gsub("^", "factor(", covariateVars)), collapse = "+"), sep = "")
  }
  return(factorStr)
}

# replace empty space with _, strip anything other than alphanumeric _ /
getCorrectFormat <- function(variable) {
  variable <- gsub("[^[:alnum:]_/]", "", gsub(" ", "_", variable))
  variable <- gsub("__", "_", variable)
  return(variable)
}
jpsurvData <- list()
# Parses the JSON string and sends to getFittedResult to create the SEER Data and the Fitted Results
getFittedResultWrapper <- function(filePath, jpsurvDataString) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  del <- ""
  # Reading json to retrieve inout variables from form in UI
  seerFilePrefix <- jpsurvData$calculate$static$seerFilePrefix
  yearOfDiagnosisVarName <- jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosisRange <- jpsurvData$calculate$form$yearOfDiagnosisRange
  allVars <- jpsurvData$calculate$static$allVars
  cohortVars <- jpsurvData$calculate$form$cohortVars
  cohortValues <- jpsurvData$calculate$form$AllcohortValues
  numJP <- jpsurvData$calculate$form$maxjoinPoints
  covariateVars <- jpsurvData$calculate$form$covariateVars
  numbetwn <- as.integer(jpsurvData$calculate$static$advanced$advBetween)
  numfromstart <- as.integer(jpsurvData$calculate$static$advanced$advFirst)
  numtoend <- as.integer(jpsurvData$calculate$static$advanced$advLast)
  projyear <- as.integer(jpsurvData$calculate$static$advanced$advYear)
  advanced_options <- list("numbetwn" = numbetwn, "numfromstart" = numfromstart, "numtoend" = numtoend)
  delLastIntvl <- as.logical(jpsurvData$calculate$static$advanced$advDeleteInterval)
  # Non-changing token id to indicate session, tokent id changes upon each calc, bu this only changes when page is refreshed.
  type <- jpsurvData$additional$input_type
  length <- length(jpsurvData$calculate$form$cohortVars)
  # Creating each possible cohort combination
  combination_array <- c()
  # making an array containing each cohort
  for (i in 1:length) {
    combination_array[i] <- jpsurvData$calculate$form$AllcohortValues[i]
  }
  # creates a matrix of each possible combination
  com_matrix <- as.matrix(expand.grid(combination_array))
  jsonl <- list()
  valid_com_matrix <- matrix(, nrow = 0, ncol(com_matrix))
  errors <- list(invalidCohorts = c(), errorCohorts = c())

  if (length(com_matrix) > 0) {
    for (i in 1:nrow(com_matrix)) {
      valid <- validateCohort(
        jpsurvData, filePath, seerFilePrefix, allVars, yearOfDiagnosisVarName,
        yearOfDiagnosisRange, cohortVars, com_matrix[i, ], type, jpsurvData$additional$del
      )
      if (valid == 1) {
        valid_com_matrix <- rbind(valid_com_matrix, c(com_matrix[i, ]))
      } else {
        # errors[['msg']] = append(errors[['msg']], valid)
        cohorts <- gsub('\"', "", paste(as.vector(com_matrix[i, ]), collapse = " + "))
        errors[["invalidCohorts"]] <- append(errors[["invalidCohorts"]], cohorts)
      }
    }
    if (length(valid_com_matrix) == 0) {
      allInvalidCohorts <- paste0(paste0("<li>", errors[["invalidCohorts"]], "</li>"), collapse = "")
      msg <- paste0("<h6>No data available for the following cohort selections. Please review your input data for compatibility:</h6><ul>", allInvalidCohorts, "</ul>")
      stop(msg)
    }
  } else {
    # use original cohort matrix for csv data
    valid_com_matrix <- com_matrix
  }
  # loops through each combnation in the matrix and creates a R data file
  cohortErrorsIndex <- c()
  for (i in 1:nrow(valid_com_matrix)) {
    tryCatch(
      {
        jsonl[[i]] <- getFittedResultForVarCombo(
          i, jpsurvData, filePath, seerFilePrefix, yearOfDiagnosisVarName,
          yearOfDiagnosisRange, allVars, cohortVars, valid_com_matrix[i, ], numJP, advanced_options,
          delLastIntvl, jpsurvDataString, projyear, type, del
        )
      },
      error = function(e) {
        print(e)
        cohortErrorsIndex <<- append(cohortErrorsIndex, i)
        cohorts <- gsub('\"', "", paste(as.vector(valid_com_matrix[i, ]), collapse = " + "))
        errors[["errorCohorts"]] <<- append(errors[["errorCohorts"]], cohorts)
      }
    )
  }

  if (length(cohortErrorsIndex)) {
    if (length(cohortErrorsIndex) == nrow(valid_com_matrix)) {
      allInvalidCohorts <- paste0(paste0("<li>", errors[["invalidCohorts"]], "</li>"), collapse = "")
      allErrorCohorts <- paste0(paste0("<li>", errors[["errorCohorts"]], "</li>"), collapse = "")
      invalidMsg <- ifelse(length(errors[["invalidCohorts"]]), paste0("<h6>No data available for the following cohort selections. Please review your input data for compatibility:</h6><ul>", allInvalidCohorts, "</ul>"), "")
      errorMsg <- ifelse(length(errors[["errorCohorts"]]), paste0("<h6>The following cohort selections encountered an error. Please review your input data for compatibility:</h6><ul>", allErrorCohorts, "</ul>"), "")
      stop(paste0(invalidMsg, "<br>", errorMsg))
    }
    # remove cohorts that returned errors
    valid_com_matrix <- valid_com_matrix[-cohortErrorsIndex, , drop = FALSE]
  }

  cohortModels <- rjson::toJSON(jsonl)
  cohortCombo <- jsonlite::toJSON(valid_com_matrix)
  cohortModelsPath <- paste(filePath, paste("cohort_models-", jpsurvData$tokenId, ".json", sep = ""), sep = "/")
  cohortComboPath <- paste(filePath, paste("cohortCombo-", jpsurvData$tokenId, ".json", sep = ""), sep = "/")
  write(cohortModels, cohortModelsPath)
  write(cohortCombo, cohortComboPath)
  # Calculates graphs, model estimates etc for first combination by setting first_calc=TRUE
  getAllData(filePath, jpsurvDataString, TRUE, TRUE, cohortComboPath, errors)
}

validateCohort <- function(jpsurvData, filePath, seerFilePrefix, allVars, yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues, type, del) {
  file_name <- paste(jpsurvData$session_tokenId, seerFilePrefix, sep = "")
  file <- paste(filePath, file_name, sep = "/")
  varLabels <- getCorrectFormat(allVars)
  subsetStr <- getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
  if (type == "dic") {
    seerdata <- joinpoint.seerdata(
      seerfilename = file,
      newvarnames = varLabels,
      # NoFit=T,
      UseVarLabelsInData = varLabels
    )
  } else {
    file_name <- paste0(jpsurvData$session_tokenId, jpsurvData$file$dictionary)
    file <- paste(filePath, file_name, sep = "/")
    seerdata <- read.table(file, header = TRUE, dec = ".", sep = del, na.strings = "NA", check.names = FALSE)
  }

  stdout <- vector("character")
  con <- textConnection("stdout", "wr", local = TRUE)
  sink(con)
  valid <- input.valid(seerdata, subsetStr)
  sink()
  close(con)
  if (valid == 1) {
    return(1)
  } else {
    return(stdout)
  }
}

getFittedResultForVarCombo <- function(modelIndex, jpsurvData, filePath, seerFilePrefix, yearOfDiagnosisVarName,
                                       yearOfDiagnosisRange, allVars, cohortVars, cohortValues, numJP, advanced_options, delLastIntvl,
                                       jpsurvDataString, projyear, type, del) {
  fileName <- paste("output", jpsurvData$tokenId, modelIndex, sep = "-")
  fileName <- paste(fileName, "rds", sep = ".")
  outputFileName <- paste(filePath, fileName, sep = "/")
  # cat ('combination',modelIndex,cohortValues,"\n")
  getFittedResult(
    jpsurvData$session_tokenId, filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange,
    allVars, cohortVars, cohortValues, numJP, advanced_options, delLastIntvl, outputFileName, jpsurvDataString, projyear, type, del
  )
  jpInd <- getSelectedModel(filePath, jpsurvDataString, modelIndex) - 1
  return(jpInd)
}

getAllData <- function(filePath, jpsurvDataString, first_calc = FALSE, use_default = TRUE, valid_com_matrix, errors = NULL) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  imageId <- jpsurvData$plot$static$imageId
  com <- as.integer(jpsurvData$run)
  interval <- ""
  observed <- ""
  type <- jpsurvData$additional$input_type # csv or dictionary
  headers <- list()
  del <- ""
  runs <- getRunsString(valid_com_matrix) # gets run string
  # if input type is a CSV file
  if (type == "csv") {
    header <- as.logical(jpsurvData$additional$has_header) # contains headers?
    seerFilePrefix <- jpsurvData$file$dictionary
    file_name <- paste(jpsurvData$session_tokenId, seerFilePrefix, sep = "")
    file <- paste(filePath, file_name, sep = "/")
    del <- jpsurvData$additional$del
    if (del == "\t" || del == " ") {
      del <- ""
    }
    seerdata <- read.table(file, header = TRUE, dec = ".", sep = del, na.strings = "NA", check.names = FALSE)
    observed <- names(seerdata)[jpsurvData$additional$observed]
    interval <- names(seerdata)[as.integer(jpsurvData$additional$interval)]
    input_type <- "csv"
    died <- names(seerdata)[jpsurvData$additional$died]
    alive_at_start <- names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup <- names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int <- names(seerdata)[jpsurvData$additional$exp_int]
    statistic <- jpsurvData$additional$statistic
    if (statistic == "Relative Survival") {
      headers <- list("Died" = died, "Alive_at_Start" = alive_at_start, "Lost_to_followup" = lost_to_followup, "Expected_Survival_Interval" = exp_int, "Interval" = interval, "Relative_Survival_Cum" = observed)
    } else if (statistic == "Cause-Specific Survival") {
      headers <- list("Died" = died, "Alive_at_Start" = alive_at_start, "Lost_to_followup" = lost_to_followup, "Expected_Survival_Interval" = exp_int, "Interval" = interval, "CauseSpecific_Survival_Cum" = observed)
    }
  } else {
    observed <- jpsurvData$additional$DataTypeVariable
    interval <- "Interval"
    input_type <- "dic"
  }
  ModelSelection <- geALLtModelWrapper(filePath, jpsurvDataString, com)
  Coefficients <- getcoefficientsWrapper(filePath, jpsurvDataString, first_calc, com)
  JP <- getJPWrapper(filePath, jpsurvDataString, first_calc, com)
  SelectedModel <- getSelectedModel(filePath, jpsurvDataString, com)
  statistic <- jpsurvData$additional$statistic
  if (statistic == "Relative Survival") {
    statistic <- "Relative_Survival_Cum"
  } else if (statistic == "Cause-Specific Survival") {
    statistic <- "CauseSpecific_Survival_Cum"
  }
  jpInd <- jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(jpInd)) {
    jpInd <- SelectedModel - 1
  }
  yod <- jpsurvData$additional$yearOfDiagnosis
  intervals <- jpsurvData$additional$intervals
  if (use_default == TRUE) {
    yod <- jpsurvData$additional$yearOfDiagnosis_default
    intervals <- jpsurvData$additional$intervals_default
  }

  # get year column var name
  yearVar <- getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)
  # create datasets for download
  fullDownload <- downloadDataWrapper(jpsurvDataString, filePath, com, runs, yearVar, jpInd, "full")
  deathGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, runs, yearVar, jpInd, "death")
  survGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, runs, yearVar, jpInd, "year")
  timeGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, runs, yearVar, jpInd, "time")
  # create graphs
  deathGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, NULL, interval, deathGraphData, "death", statistic)
  yearGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, NULL, interval, survGraphData, "year", statistic)
  timeGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, runs, interval, timeGraphData, "time", statistic)
  # get jp locations
  jpLocation <- getAllJP(filePath, jpsurvDataString, com)

  jsonl <- list(
    "Coefficients" = Coefficients,
    "ModelSelection" = ModelSelection,
    "JP" = JP,
    "SelectedModel" = SelectedModel,
    "Runs" = runs,
    "input_type" = input_type,
    "headers" = headers,
    "statistic" = statistic,
    "com" = com,
    "jpInd" = jpInd,
    "imageId" = imageId,
    "yod" = yod,
    "intervals" = intervals,
    "yearVar" = yearVar,
    "deathData" = deathGraph,
    "yearData" = yearGraph,
    "timeData" = timeGraph,
    "fullDownload" = fullDownload,
    "jpLocation" = jpLocation,
    "errors" = errors
  )
  exportJson <- rjson::toJSON(jsonl)
  filename <- paste(filePath, paste("results-", jpsurvData$tokenId, "-", com, "-", jpInd, ".json", sep = ""), sep = "/")
  write(exportJson, filename)
  return(filename)
}

getTrendsData <- function(filePath, jpsurvDataString, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  com <- as.integer(jpsurvData$run)
  Trends <- getTrendWrapper(filePath, jpsurvDataString, com)
  jsonl <- c(Trends) # returns
  exportJson <- rjson::toJSON(jsonl)
  filename <- paste(filePath, paste("trend_results-", jpsurvData$tokenId, ".json", sep = ""), sep = "/") # CSV file to download
  write(exportJson, filename)
}

# Creates the SEER Data and Fitted Result
getFittedResult <- function(tokenId, filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange,
                            allVars, cohortVars, cohortValues, numJP, advanced_options, delLastIntvlAdv, outputFileName, jpsurvDataString, projyear, type,
                            alive_at_start = NULL, interval = NULL, died = NULL, lost_to_followup = NULL, rel_cum = NULL) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  type <- jpsurvData$additional$input_type
  varLabels <- getCorrectFormat(allVars)
  intervalRange <- as.integer(jpsurvData$calculate$form$interval)
  statistic <- jpsurvData$additional$DataTypeVariable
  subsetStr <- getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
  if (type == "dic") {
    file_name <- paste(tokenId, seerFilePrefix, sep = "")
    file <- paste(filePath, file_name, sep = "/")
    seerdata <- joinpoint.seerdata(
      seerfilename = file,
      newvarnames = varLabels,
      # NoFit=T,
      UseVarLabelsInData = varLabels
    )
    # get subset of seerdata containing rows within user defined interval range (Intervals from Diagnosis Range)
    seerdataSub <- subset(seerdata, Interval <= intervalRange)
    fittedResult <- joinpoint(
      seerdataSub,
      subset = subsetStr,
      year = getCorrectFormat(yearOfDiagnosisVarName),
      observedrelsurv = statistic,
      model.form = ~NULL,
      op = advanced_options,
      delLastIntvl = delLastIntvlAdv,
      maxnum.jp = numJP,
      proj.year.num = projyear
    )
  }
  if (type == "csv") {
    del <- jpsurvData$additional$del
    file_name <- paste(tokenId, jpsurvData$file$dictionary, sep = "")
    file <- paste(filePath, file_name, sep = "/")
    if (del == "\t" || del == " ") {
      del <- ""
    }
    seerdata <- read.table(file, header = TRUE, dec = ".", sep = del, na.strings = "NA", check.names = FALSE)
    intervalRange <- as.integer(jpsurvData$calculate$form$interval)
    alive_at_start <- names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup <- names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int <- names(seerdata)[jpsurvData$additional$exp_int]
    observed <- names(seerdata)[jpsurvData$additional$observed]
    interval <- names(seerdata)[as.integer(jpsurvData$additional$interval)]
    died <- names(seerdata)[jpsurvData$additional$died]
    seerdataSub <- subset(seerdata, Interval <= intervalRange)
    fittedResult <- joinpoint(seerdataSub,
      subset = subsetStr,
      year = getCorrectFormat(yearOfDiagnosisVarName),
      interval = interval,
      number.event = died,
      number.alive = alive_at_start,
      number.loss = lost_to_followup,
      expected.rate = exp_int,
      observedrelsurv = observed,
      model.form = NULL,
      delLastIntvl = delLastIntvlAdv,
      op = advanced_options,
      maxnum.jp = numJP
    )
  }
  # save seerdata and fit.result as RData
  cat("***outputFileName")
  cat(outputFileName)
  outputData <- list("seerdata" = seerdata, "fittedResult" = fittedResult)
  saveRDS(outputData, outputFileName)
}

# Gets the coefficients table in the Model Estimates tab
getcoefficientsWrapper <- function(filePath, jpsurvDataString, first_calc, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  fileName <- paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = "")
  jpInd <- jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(jpInd)) {
    jpInd <- getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  file <- paste(filePath, fileName, sep = "/")
  outputData <- readRDS(file)
  coefficients <- outputData$fittedResult$FitList[[jpInd + 1]]$coefficients
  Xvector <- paste(rownames(coefficients), collapse = ", ")
  length <- length(coefficients) / 2
  Estimates <- paste(coefficients[1:length, 1], collapse = ", ")
  Std_Error <- paste(coefficients[1:length, 2], collapse = ", ")
  results <- list("Xvectors" = Xvector, "Estimates" = Estimates, "Std_Error" = Std_Error)
  return(results)
}

# gets all the model selection info for all joint points
geALLtModelWrapper <- function(filePath, jpsurvDataString, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  fileName <- paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = "")
  jpInd <- jpsurvData$additional$headerJoinPoints
  file <- paste(filePath, fileName, sep = "/")
  outputData <- readRDS(file)
  jsonl <- list()
  saved <- outputData$fittedResult$FitList
  joints <- list()
  ModelSelection <- list()
  for (i in 1:length(saved)) {
    name <- paste0("joinpoint", i)
    aicJson <- saved[[i]]$aic
    bicJson <- saved[[i]]$bic
    llJson <- saved[[i]]$ll
    convergedJson <- saved[[i]]$converged
    joints[[name]] <- list("aic" = aicJson, "bic" = bicJson, "ll" = llJson, "converged" = convergedJson)
  }
  ModelSelection <- joints
  return(ModelSelection)
}

getTrendWrapper <- function(filePath, jpsurvDataString, com) {
  jsonl <- c()
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  fileName <- paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = "")
  jpInd <- jpsurvData$additional$headerJoinPoints
  file <- paste(filePath, fileName, sep = "/")
  outputData <- readRDS(file)
  jpInd <- as.integer(jpsurvData$additional$headerJoinPoints)
  trend_types <- c("RelChgHaz", "AbsChgSur", "RelChgSur")
  outputData <- readRDS(file)
  interval <- strtoi(jpsurvData$trendsInterval)
  file <- paste(filePath, fileName, sep = "/")
  trend1 <- rjson::toJSON(aapc(outputData$fittedResult$FitList[[jpInd + 1]], type = "RelChgSur", interval = interval))
  trend2 <- rjson::toJSON(aapc(outputData$fittedResult$FitList[[jpInd + 1]], type = "AbsChgSur", interval = interval))
  trend3 <- rjson::toJSON(aapc(outputData$fittedResult$FitList[[jpInd + 1]], type = "RelChgHaz", interval = interval))
  jsonl <- c("CS_AAPC" = trend1, "CS_AAAC" = trend2, "HAZ_APC" = trend3)
  return(jsonl)
}

getJPWrapper <- function(filePath, jpsurvDataString, first_calc, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  file <- paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData <- readRDS(file)
  jpInd <- jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(jpInd)) {
    jpInd <- getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  JP_List <- outputData$fittedResult$FitList[[jpInd + 1]]$jp
  JP <- paste(JP_List, collapse = " ")
  return(JP)
}

getAllJP <- function(filePath, jpsurvDataString, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  file <- paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData <- readRDS(file)
  maxJP <- jpsurvData$calculate$form$maxjoinPoints
  allJP <- c("None")
  if (maxJP > 0) {
    for (i in 1:maxJP) {
      JP_List <- outputData$fittedResult$FitList[[i + 1]]$jp
      allJP <- append(allJP, paste(JP_List, collapse = " "))
    }
  }
  return(allJP)
}

getSelectedModel <- function(filePath, jpsurvDataString, com) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  file <- paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData <- readRDS(file)
  model <- length(outputData$fittedResult$jp) + 1
  return(model)
}

# Creates a string containing each cohort combination, each combination is sperated by a , and each cohort seperated by a +
# ex: ch1 + ch2 + ch3, ch1 + ch2 + ch4
getRunsString <- function(valid_com_matrix) {
  cohorts <- read_json(valid_com_matrix)
  runs <- ""
  if (length(cohorts) > 0) {
    for (i in 1:length(cohorts)) {
      row <- paste(cohorts[[i]], collapse = " + ")
      runs <- paste(runs, gsub("\"", "", row), sep = " jpcom ")
    }
    runs <- substr(runs, 7, nchar(runs))
  }
  return(unbox(runs))
}

# scalar multiply data by 100 for display as a percentage
scaleTo <- function(data) {
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
    "Predicted_Survival_Cum_SE"
  )
  for (col in columns) {
    if (!is.null(data[[col]])) {
      data[[col]] <- data[[col]] * 100
    }
  }
  return(data)
}

downloadDataWrapper <- function(jpsurvDataString, filePath, com, runs, yearVar, jpInd, downloadtype) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  file <- paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData <- readRDS(file)
  input <- outputData[["seerdata"]]
  fit <- outputData[["fittedResult"]]
  yearOfDiagnosisRange <- jpsurvData$calculate$form$yearOfDiagnosisRange
  cohortVars <- jpsurvData$calculate$form$cohortVars
  cohortValues <- c()
  if (runs != "") {
    cohortCombo <- strsplit(runs, "jpcom")[[1]][[com]]
    cohortCombo <- strsplit(cohortCombo, "+", fixed = TRUE)[[1]]
    for (cohort in cohortCombo) {
      value <- paste(paste('\"', trimws(cohort), sep = ""), '\"', sep = "")
      cohortValues <- append(cohortValues, value)
    }
  }
  subsetStr <- getSubsetStr(yearVar, yearOfDiagnosisRange, cohortVars, cohortValues)
  intervals <- c()
  if (downloadtype == "year") {
    for (i in 1:length(jpsurvData$additional$intervals)) {
      intervals <- c(intervals, jpsurvData$additional$intervals[[i]])
    }
    return(download.data(input, fit, jpInd, yearVar, downloadtype = "graph", int.select = intervals, subset = subsetStr))
  } else if (downloadtype == "death") {
    for (i in 1:length(jpsurvData$additional$intervalsDeath)) {
      intervals <- c(intervals, jpsurvData$additional$intervalsDeath[[i]])
    }
    return(download.data(input, fit, jpInd, yearVar, downloadtype = "graph", int.select = intervals, subset = subsetStr))
  } else if (downloadtype == "time") {
    intervalRange <- as.integer(jpsurvData$calculate$form$interval)
    range <- (c(1:intervalRange))
    return(download.data(input, fit, jpInd, yearVar, downloadtype = "graph", int.select = range, subset = subsetStr))
  } else {
    fullData <- download.data(input, fit, jpInd, yearVar, downloadtype = "full", subset = subsetStr)
    return(scaleTo(fullData))
  }
}

# creates graphs
getGraphWrapper <- function(filePath, jpsurvDataString, first_calc, com, runs, interval, graphData, type, statistic) {
  jpsurvData <- rjson::fromJSON(jpsurvDataString)
  iteration <- jpsurvData$plot$static$imageId
  yearVar <- getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)
  nJP <- jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(nJP)) {
    nJP <- getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  data <- paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData <- readRDS(data)
  fit <- outputData[["fittedResult"]]
  obsintvar <- "Relative_Survival_Interval"
  predintvar <- "Predicted_ProbDeath_Int"
  obscumvar <- "Relative_Survival_Cum"
  predcumvar <- "Predicted_Survival_Cum"
  if (statistic == "CauseSpecific_Survival_Cum") {
    obsintvar <- "CauseSpecific_Survival_Interval"
    obscumvar <- "CauseSpecific_Survival_Cum"
  }
  # create graph
  if (type == "death") {
    trend <- jpsurvData$additional$deathTrend
    data <- NULL
    # check if annotation is possible
    if (!is.null(trend) && trend == 1) {
      # if (nJP <= 3 && length(jpsurvData$additional$intervalsDeath) <= 3) {
      # data = Plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 1, trend = 1)
      # } else {
      data <- Plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 0, trend = 1)
      # }
    } else {
      plot <- Plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 0, trend = 0)
      ggsave(file = paste(filePath, paste("plot_Death-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/"))
      graphFile <- paste(filePath, paste("plot_Death-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/")
      graphData <- (scaleTo(graphData))
      results <- list("deathGraph" = graphFile, "deathTable" = graphData)
      return(results)
    }
    if (length(data) == 2) {
      # Trend + plot
      trendTable <- data[[1]]
      plot <- data[[2]]
      ggsave(file = paste(filePath, paste("plot_Death-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/"), plot = plot)
      graphFile <- paste(filePath, paste("plot_Death-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/")
      graphData <- (scaleTo(graphData))
      results <- list("deathGraph" = graphFile, "deathTable" = graphData, "deathTrend" = trendTable)
      return(results)
      # } else if (length(data) == 3) {   # Trend + plot + anno
      #   trendTable = data[[1]]
      #   plot.anno <- data[[2]]
      #   ggsave(file=paste(filePath, paste("plot_DeathAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot.anno)
      #   plot = data[[3]]
      #   ggsave(file=paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      #   graphFile = paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      #   graphAnnoFile = paste(filePath, paste("plot_DeathAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      #   graphData = (scaleTo(graphData))
      #   results = list("deathGraph" = graphFile, "deathGraphAnno" = graphAnnoFile, "deathTable" = graphData, "deathTrend" = trendTable)
      #   return(results)
    }
  } else if (type == "year") {
    trend <- jpsurvData$additional$yearTrend
    absRange <- jpsurvData$additional$absChgRange
    intervals <- jpsurvData$additional$intervals
    data <- NULL
    # check if annotation is possible
    if ((!is.null(trend) && trend == 1) || !is.null(absRange)) {
      # if (nJP <= 3 && length(intervals) <= 3) {
      # data = Plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 1, trend = 1)
      # } else {
      data <- Plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 0, trend = 1)
      # }
    } else {
      plot <- Plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 0, trend = 0)
      ggsave(file = paste(filePath, paste("plot_Year-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/"))
      graphFile <- paste(filePath, paste("plot_Year-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/")
      graphData <- (scaleTo(graphData))
      results <- list("survGraph" = graphFile, "survTable" = graphData)
      return(results)
    }

    if (is.null(absRange)) {
      # between joinpoint only
      trends <- list("ACS.jp" = data[[1]])
    } else {
      # check if both trends
      if (is.null(trend) || trend == 0) {
        # between calendar only
        trends <- list("ACS.user" = aapc.multiints(fit$FitList[[nJP + 1]], type = "AbsChgSur", int.select = intervals, ACS.range = absRange, ACS.out = "user"))
      } else {
        trends <- aapc.multiints(fit$FitList[[nJP + 1]], type = "AbsChgSur", int.select = intervals, ACS.range = absRange, ACS.out = "both")
      }
    }

    if (length(data) == 2) {
      # Trend + plot
      plot <- data[[2]]
      ggsave(file = paste(filePath, paste("plot_Year-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/"), plot = plot)
      graphFile <- paste(filePath, paste("plot_Year-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/")
      graphData <- (scaleTo(graphData))
      results <- list("survGraph" = graphFile, "survTable" = graphData, "survTrend" = trends)
      return(results)
      # } else if (length(data) == 3) {   # Trend + plot + anno
      #   plot.anno = data[[2]]
      #   ggsave(file=paste(filePath, paste("plot_YearAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot.anno)
      #   plot = data[[3]]
      #   ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      #   graphFile = paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      #   graphAnnoFile = paste(filePath, paste("plot_YearAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      #   graphData = (scaleTo(graphData))
      #   results = list("survGraph" = graphFile, "survGraphAnno" = graphAnnoFile, "survTable" = graphData, "survTrend" = trends)
      #   return(results)
    }
  } else if (type == "time") {
    years <- jpsurvData$additional$yearOfDiagnosis
    params <- jpsurvData$calculate$form
    seerdata <- outputData[["seerdata"]]
    fit <- outputData[["fittedResult"]]$FitList[[nJP + 1]]$predicted
    if (length(params$cohortVars) > 0) {
      cohortCombo <- strsplit(runs, "jpcom")[[1]][[com]]
      cohortCombo <- strsplit(cohortCombo, "+", fixed = TRUE)[[1]]
      # fix cohort variable names
      for (i in 1:length(params$cohortVars)) {
        if (params$cohortValues[i] != "\"\"") {
          cohortVar <- getCorrectFormat(params$cohortVars[i])
          seerdata <- seerdata[seerdata[cohortVar] == trimws(cohortCombo[i]), ]
        }
      }
      minInterval <- min(fit$Interval)
      maxInterval <- max(fit$Interval)
      maxYear <- max(seerdata[, yearVar])
      minYear <- min(seerdata[, yearVar])
      if (length(years) > 0) {
        if (minYear > years) {
          years <- minYear
        }
      } else {
        years <- minYear
      }
    }
    graph <- Plot.surv.int.multiyears(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, year.select = years)
    graphFile <- paste(filePath, paste("plot_Int-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/")
    ggsave(file = paste(filePath, paste("plot_Int-", jpsurvData$tokenId, "-", com, "-", nJP, "-", iteration, ".png", sep = ""), sep = "/"))
    graphData <- scaleTo(graphData)
    graphData <- graphData[graphData[[yearVar]] %in% years, ]
    if (exists("minYear")) {
      results <- list("timeGraph" = graphFile, "timeTable" = graphData, "minYear" = minYear, "maxYear" = maxYear, "minInt" = minInterval, "maxInt" = maxInterval)
    } else {
      results <- list("timeGraph" = graphFile, "timeTable" = graphData)
    }
    return(results)
  }
}

removeEscape <- function(str) {
  gsub("\"+", "", str)
}


conditionalJoinpoint <- function(jsonParams, folder) {
  params <- jsonlite::fromJSON(jsonParams)
  state <- params$state
  startIntervals <- params$startIntervals
  endIntervals <- params$endIntervals
  filepath <- file.path(folder, paste0("output-", state$tokenId, "-", state$run, ".rds"))
  data <- readRDS(filepath)
  fit <- data$fittedResult
  conditionalSurvival <- joinpoint.conditional(fit, startIntervals, endIntervals)
  savePath <- file.path(folder, "conditionalSurvivalPrediction.rds")
  saveRDS(conditionalSurvival, savePath)
  return(rjson::toJSON(conditionalSurvival))
}
