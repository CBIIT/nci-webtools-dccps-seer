# Title     : Script to interface with the recurrence package
# Objective :
# Created by:
# Created on: 9/18/18

#this will eventually be a compiled library
source("R/app_functions_Rconsole.R")
library(jsonlite)

methods <- c("handleGroupMetadata","handleIndividualMetadata","handleRecurrenceRiskGroup")

handleInterface <- function(args) {
  cat("Handle interface called","\n", file = stdout())
  method = args$method
  stopifnot( exists("method"), match(method,methods) > 0 )
  args$method = NULL
  do.call(method,args)
}

handleGroupMetadata <- function(requestId,seerDictionaryFile,seerDataFile) {
  cat("handleGroupMetadata() ",requestId,"\n", file = stdout())
  stopifnot(exists("seerDictionaryFile"),exists("seerDataFile"),
  file.exists(seerDictionaryFile),file.exists(seerDataFile))
  seerData = read.SeerStat(seerDictionaryFile,seerDataFile)
  seerVars = choices.vars(seerData)

  intervalIndex = match('interval',tolower(seerVars))
  stopifnot(intervalIndex > 0)

  stageData = seerData[,seerVars[1:intervalIndex-1]]
  stageVars = seerVars[1:intervalIndex-1]

  metadata = c()
  metadata$variables = stageVars
  metadata$values = lapply(stageData,function(x) sort(unique(x)))
  metadata$maxFollowUp = max(seerData[intervalIndex])
  return(metadata)
}

handleIndividualMetadata <- function() { }

handleRecurrenceRiskGroup <- function(requestId, seerDictionaryFile, seerDataFile, canSurvDataFile,
  stageVariable, stageValue, adjustmentFactor, yearsOfFollowUp, workingDirectory, mimeType) {
  cat("handleRecurrenceRiskGroup() ",requestId,"\n", file = stdout())
  stopifnot(exists("seerDictionaryFile"),exists("seerDataFile"),exists('canSurvDataFile'),
    file.exists(seerDictionaryFile),file.exists(seerDataFile),file.exists(canSurvDataFile))
  seerData = read.SeerStat(seerDictionaryFile,seerDataFile)
  canSurvData = read.csv(canSurvDataFile,stringsAsFactors=F,check.names=F)
  dataTable = recurrencerisk.group(seerData,canSurvData,stageVariable,stageValue,as.numeric(adjustmentFactor),
    as.numeric(yearsOfFollowUp))

  resultFilePath = "";

  if ( "text/csv" == mimeType ) {
    resultFilePath = file.path(workingDirectory,paste0(requestId,"_result.csv"))
    write.csv(dataTable,resultFilePath,row.names=FALSE)
  } else {
    resultFilePath = file.path(workingDirectory,paste0(requestId,"_result.json"))
    write_json(dataTable,resultFilePath,na = "string", digits = NA, auto_unbox = T, dataframe = "rows")
  }
  return(resultFilePath)
}

stopifnot(exists("input"))
args = input[[1]]
cat("Interface: input exists","\n", file = stdout())
handleInterface(args)