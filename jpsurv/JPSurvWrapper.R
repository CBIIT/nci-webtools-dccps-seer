library(rjson)
library(JPSurv)
library(ggplot2)
library(ggrepel)

VERBOSE=TRUE

getDictionary <- function (inputFile, path, tokenId) {
  fqFileName = file.path(path,inputFile)
  outputFileName = paste("form-", tokenId, ".json", sep="")
  fqOutputFileName = file.path(path, outputFileName)
  seerFormData = dictionary.overview(fqFileName) 
  cat(toJSON(seerFormData), file = fqOutputFileName)
  return(tokenId)
}

ReadCSVFile <- function (inputFile, path, tokenId, jpsurvDataString,input_type) { 
  jpsurvData <- fromJSON(jpsurvDataString)
  fqFileName = file.path(path,inputFile)
  file_name=paste(jpsurvData$tokenId,fqFileName, sep="" )
  outputFileName = paste("form-", tokenId, ".json", sep="") 
  fqOutputFileName = file.path(path, outputFileName)
  #Reading mapped paramteres by user
  has_headers=as.logical(jpsurvData$mapping$has_headers);
  cohorts=jpsurvData$mapping$cohorts
  year=jpsurvData$mapping$year
  interval=jpsurvData$mapping$interval
  del=jpsurvData$additional$del
  rates=jpsurvData$additional$rates
  alive_at_start=jpsurvData$mapping$alive_at_start
  lost_to_followup=jpsurvData$mapping$lost_to_followup
  exp_int=jpsurvData$mapping$exp_int
  observed=jpsurvData$mapping$observed
  died=jpsurvData$mapping$died
  statistic=jpsurvData$additional$statistic
  #If delimter is a space or tab change it to ""
  if (del=="\t"||del==" ") { del="" }

  csvdata <- JPSurv:::read.tabledata(fileName=file.path(path, inputFile),  # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);                             # hasHeader: Boolean variable indicating whether or not the CSV being read in has a header row or not. Default is FALSE.
  dictionaryCols=c()
  if( length(cohorts) > 0) {
    dictionaryCols = c(cohorts,year,interval)
  } else {
    dictionaryCols = c(year,interval)
  }
  seerFormData = JPSurv:::write.tabledic(inputData=csvdata,          # inputData: Input data.frame.
                              idCols=dictionaryCols);
                                                          # idColNum: Integer value defining how many leading columns to create a dictionary of possible values from. Default is 1. 
  interval_name=names(csvdata)[interval]
  if (length(cohorts) > 0) {
    cohort_name=names(csvdata)[cohorts]
  } else {
    cohort_name=list()
  }
  if (length(cohorts) == 1) {
    cohort_name = list(cohort_name)
    cohorts = list(cohorts)
  }
  year_name=names(csvdata)[year]
  jsonl =list("data"=seerFormData,"cohort_names"=cohort_name,"cohort_keys"=cohorts,"year"=c(year_name,year),"interval"=c(interval_name,interval),"input_type"=input_type,"statistic"=statistic,"alive_at_start"=alive_at_start,"lost_to_followup"=lost_to_followup,"exp_int"=exp_int,"observed"=observed,"died"=died,"has_headers"=has_headers,"del"=del,"rates"=rates)
  exportJson <- toJSON(jsonl)
  write(exportJson, fqOutputFileName)
  return(tokenId)
}

#Creates the subset expression for fitted result
getSubsetStr <- function (yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues) {
  yearOfDiagnosisVarName=paste0("`",getCorrectFormat(yearOfDiagnosisVarName), "`")
  startYearStr=paste(yearOfDiagnosisVarName, ">=", yearOfDiagnosisRange[1])
  endYearStr=paste(yearOfDiagnosisVarName, "<=", yearOfDiagnosisRange[2])
  yearStr=paste(startYearStr, endYearStr, sep=' & ')
  subsetStr = ""
  if( length(cohortVars) > 0 ) {
    cohortVars=paste0("`",getCorrectFormat(cohortVars), "`")
    subsetStr=paste(paste(cohortVars, cohortValues, sep="=="), collapse=' & ')
    subsetStr=paste(subsetStr, yearStr, sep=' & ')
  } else {
    subsetStr=paste(subsetStr, yearStr, sep='')
  }
  return (subsetStr)
}

#Creates the model.form expression for fitted result
getFactorStr <- function (covariateVars) {
  factorStr=""
  if (nchar(covariateVars)!=0) {
    covariateVars=paste0("`", getCorrectFormat(covariateVars), "`")
    factorStr=paste("~-1+", paste(gsub("$", ")", gsub("^", "factor(", covariateVars)), collapse="+"), sep='')
  }
  return (factorStr)
}

#replace empty space with _, strip anything other than alphanumeric _ /
getCorrectFormat = function(variable) {
                            variable=gsub("[^[:alnum:]_/]", "", gsub(" ", "_", variable))
                            variable=gsub("__", "_",variable)
                            return (variable)
                          }
jpsurvData = list()
#Parses the JSON string and sends to getFittedResult to create the SEER Data and the Fitted Results
getFittedResultWrapper <- function (filePath, jpsurvDataString) {
  jpsurvData <- fromJSON(jpsurvDataString)
  del=""
  #Reading json to retrieve inout variables from form in UI
  seerFilePrefix = jpsurvData$calculate$static$seerFilePrefix
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosisRange = jpsurvData$calculate$form$yearOfDiagnosisRange
  allVars=jpsurvData$calculate$static$allVars
  cohortVars=jpsurvData$calculate$form$cohortVars
  cohortValues=jpsurvData$calculate$form$AllcohortValues
  numJP=jpsurvData$calculate$form$maxjoinPoints
  covariateVars=jpsurvData$calculate$form$covariateVars
  numbetwn=as.integer(jpsurvData$calculate$static$advanced$advBetween)
  numfromstart=as.integer(jpsurvData$calculate$static$advanced$advFirst)
  numtoend=as.integer(jpsurvData$calculate$static$advanced$advLast)
  projyear=as.integer(jpsurvData$calculate$static$advanced$advYear)
  advanced_options=list("numbetwn"=numbetwn,"numfromstart"=numfromstart,"numtoend"=numtoend)
  delLastIntvl=as.logical(jpsurvData$calculate$static$advanced$advDeleteInterval)
  #Non-changing token id to indicate session, tokent id changes upon each calc, bu this only changes when page is refreshed.
  type=jpsurvData$additional$input_type
   length=length(jpsurvData$calculate$form$cohortVars)
  #Creating each possible cohort combination
  combination_array=c()
  #making an array containing each cohort
  for(i in 1:length) {
    combination_array[i]=jpsurvData$calculate$form$AllcohortValues[i]
  }
  #creates a matrix of each possible combination
  com_matrix=as.matrix(expand.grid(combination_array))
  jsonl=list()
  #loops through each combnation in t he matrix and creates a R data file
  if (nrow(com_matrix) > 0 ) {
    for (i in 1:nrow(com_matrix)) {
        jsonl[[i]]=getFittedResultForVarCombo(i,jpsurvData,filePath,seerFilePrefix,yearOfDiagnosisVarName,
          yearOfDiagnosisRange, allVars, cohortVars, com_matrix[i,], numJP,advanced_options, delLastIntvl,
          jpsurvDataString,projyear,type,del)
    }
  } else {
      jsonl[[1]]=getFittedResultForVarCombo(1,jpsurvData,filePath,seerFilePrefix,yearOfDiagnosisVarName,
        yearOfDiagnosisRange, allVars, cohortVars, matrix(nrow = 0, ncol = 0), numJP,advanced_options, delLastIntvl,
        jpsurvDataString,projyear,type,del)
  }
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("cohort_models-", jpsurvData$tokenId, ".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
  #Calculates graphs, model estimates etc for first combination by setting first_calc=TRUE
  getAllData(filePath,jpsurvDataString,TRUE)
  return
}

getFittedResultForVarCombo<- function(modelIndex,jpsurvData,filePath,seerFilePrefix,yearOfDiagnosisVarName,
    yearOfDiagnosisRange, allVars, cohortVars, cohortValues, numJP,advanced_options, delLastIntvl,
    jpsurvDataString,projyear,type,del) {
  fileName = paste('output', jpsurvData$tokenId,modelIndex,sep="-" )
  fileName = paste(fileName, "rds", sep="." )
  outputFileName =paste(filePath, fileName, sep="/" )
  #cat ('combination',modelIndex,cohortValues,"\n")
  getFittedResult(jpsurvData$session_tokenId,filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange,
    allVars, cohortVars, cohortValues, numJP,advanced_options, delLastIntvl, outputFileName,jpsurvDataString,projyear,type,del)
  Selected_Model=getSelectedModel(filePath,jpsurvDataString,modelIndex)
  return (Selected_Model-1)
}

getAllData<- function(filePath,jpsurvDataString,first_calc=FALSE,use_default=TRUE) { 
  jpsurvData <- fromJSON(jpsurvDataString)
  imageId=jpsurvData$plot$static$imageId
  com=as.integer(jpsurvData$run)
  interval=""
  observed=""
  type=jpsurvData$additional$input_type #csv or dictionary
  headers=list()
  del=""
  runs=getRunsString(filePath, jpsurvDataString) #gets runs tring
  #if input type is a CSV file
  if (type=="csv") {
    header=as.logical(jpsurvData$additional$has_header) #contains headers?
    seerFilePrefix = jpsurvData$file$dictionary
    file_name=paste(jpsurvData$session_tokenId,seerFilePrefix, sep="" )
    file=paste(filePath, file_name, sep="/" )
    del=jpsurvData$additional$del
    if (del=="\t"||del==" ") { del="" }
    seerdata =  JPSurv:::read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);    
    observed=names(seerdata)[jpsurvData$additional$observed]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    input_type="csv"
    died=names(seerdata)[jpsurvData$additional$died]
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    # interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    # observed=names(seerdata)[jpsurvData$additional$observed]
    statistic=jpsurvData$additional$statistic
    if (statistic=="Relative Survival") {
      headers=list("Died"=died,"Alive_at_Start"=alive_at_start,"Lost_to_followup"=lost_to_followup,"Expected_Survival_Interval"=exp_int,"Interval"=interval,"Relative_Survival_Cum"=observed)
    } else if (statistic=="Cause-Specific Survival") {
          headers=list("Died"=died,"Alive_at_Start"=alive_at_start,"Lost_to_followup"=lost_to_followup,"Expected_Survival_Interval"=exp_int,"Interval"=interval,"CauseSpecific_Survival_Cum"=observed)
    } 
  } else {
        observed=jpsurvData$additional$DataTypeVariable
        interval="Interval"
        input_type="dic"
  }
  ModelSelection=geALLtModelWrapper(filePath,jpsurvDataString,com)
  Coefficients=getcoefficientsWrapper(filePath,jpsurvDataString,first_calc,com)
  JP=getJPWrapper(filePath,jpsurvDataString,first_calc,com)
  Selected_Model=getSelectedModel(filePath,jpsurvDataString,com)
  statistic = jpsurvData$additional$statistic
  if (statistic=="Relative Survival") {
    statistic="Relative_Survival_Cum"
  } else if (statistic=="Cause-Specific Survival") {
    statistic="CauseSpecific_Survival_Cum" 
  }
  jpInd=jpsurvData$additional$headerJoinPoints
  if (is.null(jpInd)) {
    jpInd = getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  # get year column var name
  yearVar = getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)  
  # create datasets for download
  fullDownload <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, 'full')
  deathGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, 'death')
  survGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, 'year')
  timeGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, 'time')
  # create graphs
  deathGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, interval, deathGraphData, 'death', statistic)
  yearGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, interval, survGraphData, 'year', statistic)
  timeGraph <- getGraphWrapper(filePath, jpsurvDataString, first_calc, com, interval, timeGraphData, 'time', statistic)

  SelectedModel=getSelectedModel(filePath,jpsurvDataString,com)
  if (first_calc==TRUE||is.null(jpInd)) {
    jpInd=SelectedModel-1
  }
  yod=jpsurvData$additional$yearOfDiagnosis
  intervals=jpsurvData$additional$intervals
  if (use_default==TRUE) {
    yod=jpsurvData$additional$yearOfDiagnosis_default
    intervals=jpsurvData$additional$intervals_default
  }
  jsonl =list("Coefficients" = Coefficients,
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
              "fullDownload" = fullDownload) #returns
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("results-", jpsurvData$tokenId,"-",com,"-",jpInd, ".json", sep=""), sep="/") 
  write(exportJson, filename)
}

getTrendsData<-function(filePath,jpsurvDataString,com) {
  jpsurvData <- fromJSON(jpsurvDataString)
  com=as.integer(jpsurvData$run)
  Trends=getTrendWrapper(filePath,jpsurvDataString,com)
  jsonl =c(Trends) #returns
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("trend_results-", jpsurvData$tokenId,".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
}

#Creates the SEER Data and Fitted Result
getFittedResult <- function (tokenId,filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange,
    allVars, cohortVars,cohortValues, numJP, advanced_options,delLastIntvlAdv,outputFileName,jpsurvDataString,projyear,type,
    alive_at_start=NULL,interval=NULL,died=NULL,lost_to_followup=NULL,rel_cum=NULL) {
  jpsurvData <- fromJSON(jpsurvDataString)
  type=jpsurvData$additional$input_type
  varLabels=getCorrectFormat(allVars)
  intervalRange = as.integer(jpsurvData$calculate$form$interval)
  statistic=jpsurvData$additional$DataTypeVariable
  subsetStr <- getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
  if (type=="dic") {
    file_name=paste(tokenId,seerFilePrefix, sep="" )
    file=paste(filePath, file_name, sep="/" )
    seerdata = joinpoint.seerdata(seerfilename=file,
                                  newvarnames=varLabels,
                                  NoFit=T,
                                  UseVarLabelsInData=varLabels)
    # get subset of seerdata containing rows within user defined interval range (Intervals from Diagnosis Range)
    seerdataSub = subset(seerdata, Interval <= intervalRange)
    fittedResult=joinpoint(seerdataSub,
                           subset = subsetStr,
                           year=getCorrectFormat(yearOfDiagnosisVarName),
                           observedrelsurv=statistic,
                           model.form = ~NULL,
                           op=advanced_options,
                           delLastIntvl=delLastIntvlAdv,
                           maxnum.jp=numJP,
                           proj.year.num=projyear);
  }
  if (type=="csv") {
    del=jpsurvData$additional$del
    file_name=paste(tokenId,jpsurvData$file$dictionary, sep="" )
    file=paste(filePath, file_name, sep="/" )
    if (del=="\t"||del==" ") {
        del=""
    }
    seerdata =  JPSurv:::read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);      
    intervalRange = as.integer(jpsurvData$calculate$form$interval)
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    observed=names(seerdata)[jpsurvData$additional$observed]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    died=names(seerdata)[jpsurvData$additional$died]
    seerdataSub = subset(seerdata, Interval <= intervalRange)
    fittedResult <- joinpoint(seerdataSub, 
                              subset = subsetStr,
                              year=getCorrectFormat(yearOfDiagnosisVarName),
                              interval=interval,                             
                              number.event=died,
                              number.alive=alive_at_start,
                              number.loss=lost_to_followup,
                              expected.rate=exp_int,
                              observedrelsurv=observed,
                              model.form = NULL,
                              delLastIntvl=delLastIntvlAdv,
                              op=advanced_options,
                              maxnum.jp = numJP);
  }
  #save seerdata and fit.result as RData
  cat("***outputFileName")
  cat(outputFileName)
  outputData=list("seerdata"=seerdata, "fittedResult"=fittedResult)
  saveRDS(outputData, outputFileName)
}

#Gets the coefficients table in the Model Estimates tab
getcoefficientsWrapper <- function (filePath,jpsurvDataString,first_calc,com) {
  jpsurvData <- fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,"-",com,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  if(first_calc==TRUE||is.null(jpInd))
  {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  coefficients=outputData$fittedResult$FitList[[jpInd+1]]$coefficients
  Xvector=paste(rownames(coefficients),collapse=", ")
  length=length(coefficients)/2
  Estimates=paste(coefficients[1:length,1],collapse=", ")
  Std_Error=paste(coefficients[1:length,2],collapse=", ")
  results= list("Xvectors"=Xvector,"Estimates"=Estimates,"Std_Error"=Std_Error)
  return(results)
}

#gets all the model selection info for all joint points
geALLtModelWrapper <- function (filePath,jpsurvDataString,com) {
  jpsurvData <- fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,"-",com,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  jsonl=list()
  saved=outputData$fittedResult$FitList
  joints=list()
  ModelSelection=list()
  for (i in 1:length(saved)) {
    name=paste0("joinpoint",i)
    aicJson=saved[[i]]$aic
    bicJson=saved[[i]]$bic
    llJson=saved[[i]]$ll
    convergedJson=saved[[i]]$converged
    joints[[name]]=list("aic"=aicJson, "bic"=bicJson, "ll"=llJson, "converged"=convergedJson)
  }
  ModelSelection=joints
  jsonl=toJSON(ModelSelection)
  return(jsonl)
}

getTrendWrapper<- function (filePath,jpsurvDataString,com) {
  jsonl=c()
  jpsurvData <- fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,"-",com,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  jpInd=as.integer(jpsurvData$additional$headerJoinPoints)
  trend_types=c("RelChgHaz","AbsChgSur","RelChgSur")
  outputData=readRDS(file)
  interval = strtoi(jpsurvData$trendsInterval);
  file=paste(filePath, fileName, sep="/" )
  trend1=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="RelChgSur", interval=interval))
  trend2=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="AbsChgSur", interval=interval))
  trend3=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="RelChgHaz", interval=interval))
  jsonl =c("CS_AAPC"=trend1,"CS_AAAC"=trend2,"HAZ_APC"=trend3)
  return(jsonl)
}

getJPWrapper<-function(filePath,jpsurvDataString,first_calc,com) {
  jpsurvData <- fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  jpInd=jpsurvData$additional$headerJoinPoints
  if(first_calc==TRUE||is.null(jpInd)) {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  JP_List=outputData$fittedResult$FitList[[jpInd+1]]$jp
  JP=paste(JP_List,collapse=" ")
  return(JP)
}

getSelectedModel<-function(filePath,jpsurvDataString,com) {
  jpsurvData <- fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)  
  model=length(outputData$fittedResult$jp)+1
  return(model)
}

# Creates a string containing each cohort combination, each combination is sperated by a , and each cohort seperated by a +
#ex: ch1 + ch2 + ch3, ch1 + ch2 + ch4
getRunsString<-function(filePath,jpsurvDataString){
  jpsurvData <- fromJSON(jpsurvDataString)
  length=length(jpsurvData$calculate$form$cohortVars)
  runs=""
  combination_array=c()
  if(length > 0) {
    for(i in 1:length){
      combination_array[i]=jpsurvData$calculate$form$AllcohortValues[i]
    }
    com_matrix=as.matrix(expand.grid(combination_array))
    for(i in 1:nrow(com_matrix)){
      row=paste(com_matrix[i,],collapse=" + ")
      runs=paste(runs,gsub("\"","",row),sep=" jpcom ")
    }
    runs=substr(runs, 7, nchar(runs))
  }
  return (runs)
}

# scalar multiply data by 100 for display as a percentage
scaleTo <- function(data) {
  columns = c('Observed_Survival_Cum', 
              'Observed_Survival_Interval', 
              'Expected_Survival_Interval',
              'Expected_Survival_Cum',
              'Relative_Survival_Interval', 
              'Relative_Survival_Cum',
              'Observed_SE_Interval',
              'Observed_SE_Cum',
              'Relative_SE_Interval',
              'Relative_SE_Cum',
              'CauseSpecific_Survival_Interval',
              'CauseSpecific_Survival_Cum',
              'CauseSpecific_SE_Interval',
              'CauseSpecific_SE_Cum',
              'Predicted_Survival_Int',
              'Predicted_ProbDeath_Int',
              'Predicted_Survival_Cum',
              'Predicted_Survival_Int_SE',
              'Predicted_ProbDeath_Int_SE',
              'Predicted_Survival_Cum_SE'
              )
  for (col in columns) {
    if (!is.null(data[[col]])) {
      data[[col]] <- data[[col]] * 100
    }
  }
  return(data)
}

downloadDataWrapper <- function(jpsurvDataString, filePath, com, yearVar, jpInd, downloadtype) {
  jpsurvData <- fromJSON(jpsurvDataString)
  file = paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData = readRDS(file)    
  input = outputData[['seerdata']]
  fit = outputData[['fittedResult']]
  yearOfDiagnosisRange = jpsurvData$calculate$form$yearOfDiagnosisRange
  cohortVars = jpsurvData$calculate$form$cohortVars
  cohortValues = jpsurvData$calculate$form$cohortValues
  subsetStr = getSubsetStr(yearVar, yearOfDiagnosisRange, cohortVars, cohortValues)
 
  intervals = c()
  if (downloadtype == 'year') {
    for (i in 1:length(jpsurvData$additional$intervals)) {
      intervals = c(intervals,jpsurvData$additional$intervals[[i]])
    } 
    return (download.data(input, fit, jpInd, yearVar, downloadtype="graph", int.select = intervals, subset = subsetStr))
  } else if (downloadtype == 'death') {
     for (i in 1:length(jpsurvData$additional$intervalsDeath)) {
        intervals = c(intervals,jpsurvData$additional$intervalsDeath[[i]])
      } 
      return(download.data(input, fit, jpInd, yearVar, downloadtype="graph", int.select = intervals, subset = subsetStr))
  } else if (downloadtype == 'time') {
      intervalRange = as.integer(jpsurvData$calculate$form$interval)
      range = (c(1:intervalRange))
      return(download.data(input, fit, jpInd, yearVar, downloadtype="graph", int.select = range, subset = subsetStr))
  } else {
      fullData = download.data(input, fit, jpInd, yearVar, downloadtype="full", subset = subsetStr)
      return(scaleTo(fullData))
  }
}

# creates graphs
getGraphWrapper <- function (filePath, jpsurvDataString, first_calc, com, interval, graphData, type, statistic) {
  jpsurvData <- fromJSON(jpsurvDataString)
  iteration = jpsurvData$plot$static$imageId
  yearVar = getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)
  nJP = jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(nJP)) {
    nJP = getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  data = paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData = readRDS(data)
  fit = outputData[['fittedResult']]
  obsintvar = "Relative_Survival_Interval"
  predintvar = "Predicted_ProbDeath_Int"
  obscumvar = "Relative_Survival_Cum"
  predcumvar = "Predicted_Survival_Cum"
  if (statistic == 'CauseSpecific_Survival_Cum') {
    obsintvar = "CauseSpecific_Survival_Interval"
    obscumvar = "CauseSpecific_Survival_Cum"
  }
  # create graph
  if (type == 'death') {
    trend = jpsurvData$additional$deathTrend 
    data = NULL
    # check if annotation is possible
    if (!is.null(trend) && trend == 1) {
      if (nJP <= 3 && length(jpsurvData$additional$intervalsDeath) <= 3) {
        data = plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 1, trend = 1)
      } else {
        data = plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 0, trend = 1)
      }
    } else {
      plot <- plot.dying.year.annotate(graphData, fit, nJP, yearVar, obsintvar, predintvar, interval, annotation = 0, trend = 0)
      ggsave(file=paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"))
      graphFile = paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("deathGraph" = graphFile, "deathTable" = graphData)
      return(results)
    }
    if (length(data) == 2) {   # Trend + plot
      trendTable = data[[1]]
      plot = data[[2]]
      ggsave(file=paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      graphFile = paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("deathGraph" = graphFile, "deathTable" = graphData, "deathTrend" = trendTable)
      return(results)
    } else if (length(data) == 3) {   # Trend + plot + anno
      trendTable = data[[1]]
      plot.anno <- data[[2]]
      ggsave(file=paste(filePath, paste("plot_DeathAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot.anno)
      plot = data[[3]]
      ggsave(file=paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      graphFile = paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphAnnoFile = paste(filePath, paste("plot_DeathAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("deathGraph" = graphFile, "deathGraphAnno" = graphAnnoFile, "deathTable" = graphData, "deathTrend" = trendTable)
      return(results)
    }
  } else if (type == 'year') {
    trend = jpsurvData$additional$yearTrend
    intervals = jpsurvData$additional$intervals
    data = NULL
    # check if annotation is possible
    if (!is.null(trend) && trend == 1) {
      if (nJP <= 3 && length(intervals) <= 3) {
        data = plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 1, trend = 1)
      } else {
        data = plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 0, trend = 1)
      }
    } else {
      plot = plot.surv.year.annotate(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, annotation = 0, trend = 0)
      ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"))
      graphFile = paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("survGraph" = graphFile, "survTable" = graphData)
      return(results)
    }

    if (length(data) == 2) {   # Trend + plot
      # trendTable = data[[1]]
      trendTable = aapc.multiints(fit, type="AbsChgSur", int.select=intervals, ACS.range=jpsurvData$additional$absChgRange)
      plot = data[[2]]
      ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      graphFile = paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("survGraph" = graphFile, "survTable" = graphData, "survTrend" = trendTable)
      return(results)
    } else if (length(data) == 3) {   # Trend + plot + anno
      # trendTable = data[[1]]
      trendTable = aapc.multiints(fit, type="AbsChgSur", int.select=intervals, ACS.range=jpsurvData$additional$absChgRange)
      plot.anno = data[[2]]
      ggsave(file=paste(filePath, paste("plot_YearAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot.anno)
      plot = data[[3]]
      ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = plot)
      graphFile = paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphAnnoFile = paste(filePath, paste("plot_YearAnno-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      graphData = scaleTo(graphData)
      results = list("survGraph" = graphFile, "survGraphAnno" = graphAnnoFile, "survTable" = graphData, "survTrend" = trendTable)
      return(results)
    }
  } else if (type == 'time') {
      years = jpsurvData$additional$yearOfDiagnosis
      graph = plot.surv.int.multiyears(graphData, fit, nJP, yearVar, obscumvar, predcumvar, interval, year.select = years)
      graphFile = paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
      ggsave(file=paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"))
      graphData = scaleTo(graphData)
      graphData = graphData[graphData[[yearVar]] %in% years,]
      results = list("timeGraph" = graphFile, "timeTable" = graphData)
  }
  return(results)
}