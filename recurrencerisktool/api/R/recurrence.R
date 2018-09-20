# Title     : Script to interface with the recurrence package
# Objective :
# Created by:
# Created on: 9/18/18

#this will eventually be a compiled library
source("R/app_functions_Rconsole.R")

handleInterface <- function() {
  cat("Handle interface called","\n", file = stdout())
  methods = c("handleGroupMetadata","handleIndividualMetadata",
    "handleRecurrenceRiskGroup")
  stopifnot( exists("method"), match(method,methods) > 0 )
  do.call(method,list())
}

handleGroupMetadata <- function() {
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

handleRecurrenceRiskGroup <- function() {
  stopifnot(exists("seerDictionaryFile"),exists("seerDataFile"),exists('canSurvDataFile'),
    file.exists(seerDictionaryFile),file.exists(seerDataFile),file.exists(canSurvDataFile))
  seerData = read.SeerStat(seerDictionaryFile,seerDataFile)
  canSurvData = read.csv(canSurvDataFile,stringsAsFactors=F,check.names=F)
  dataTable = recurrencerisk.group(seerData,canSurvData,stageVariable,stageValue,as.numeric(adjustmentFactor),
    as.numeric(yearsOfFollowUp))
  return(dataTable)
}

stopifnot(exists("input"))
cat("Interface: input exists","\n", file = stdout())
attach(input[[1]])
handleInterface()