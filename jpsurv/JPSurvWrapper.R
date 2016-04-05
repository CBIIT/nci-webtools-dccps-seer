library('rjson')
library('JPSurv')
VERBOSE=TRUE

getDictionary <- function (inputFile, path, tokenId) {
  fqFileName = file.path(path, inputFile)
  outputFileName = paste("form-", tokenId, ".json", sep="")
  fqOutputFileName = file.path(path, outputFileName)
  seerFormData = dictionary.overview(fqFileName)
  cat(toJSON(seerFormData), file = fqOutputFileName)
  return(tokenId)
}

#Creates the subset expression for fitted result
getSubsetStr <- function (yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues) {
  
  yearOfDiagnosisVarName=paste0("`",getCorrectFormat(yearOfDiagnosisVarName), "`")
  startYearStr=paste(yearOfDiagnosisVarName, ">=", yearOfDiagnosisRange[1])
  endYearStr=paste(yearOfDiagnosisVarName, "<=", yearOfDiagnosisRange[2])
  yearStr=paste(startYearStr, endYearStr, sep='&')
  cohortVars=paste0("`",getCorrectFormat(cohortVars), "`")
  
  subsetStr=paste(paste(cohortVars, cohortValues, sep="=="), collapse='&')
  subsetStr=paste(subsetStr, yearStr, sep='&')
  
  
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
getCorrectFormat <-function(variable) {
  variable=gsub("[^[:alnum:]_/]", "", gsub(" ", "_", variable))
  return (variable)
}


jpsurvData = list()

#Parses the JSON string and sends to getFittedResult to create the SEER Data and the Fitted Results
getFittedResultWrapper <- function (filePath, jpsurvDataString) {
  print ("parsing data string")
  jpsurvData <<- fromJSON(jpsurvDataString)
  
  seerFilePrefix = jpsurvData$calculate$static$seerFilePrefix
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosisRange = jpsurvData$calculate$form$yearOfDiagnosisRange
  allVars=jpsurvData$calculate$static$allVars
  cohortVars=jpsurvData$calculate$form$cohortVars
  cohortValues=jpsurvData$calculate$form$cohortValues
  covariateVars=jpsurvData$calculate$form$covariateVars
  numJP=jpsurvData$calculate$form$maxjoinPoints
  
  numbetwn=jpsurvData$calculate$static$advanced$advBetween
  numfromstart=jpsurvData$calculate$static$advanced$advFirst
  numtoend=jpsurvData$calculate$static$advanced$advLast
  
  adanced_options=list(numbetwn,numfromstart,numtoend)
  delLastIntvl=as.logical(jpsurvData$calculate$static$advanced$advDeleteInterval)
  
  
  fileName = paste('output', jpsurvData$tokenId, sep="-" )
  fileName = paste(fileName, "rds", sep="." )
  
  outputFileName =paste(filePath, fileName, sep="/" )
  print (outputFileName)
  ptm <- proc.time()
  getFittedResult(filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange, allVars, cohortVars, cohortValues, covariateVars, numJP,adanced_options, delLastIntvl, outputFileName,jpsurvDataString)
  
  print("Fitted Result Time:")
  
  print(proc.time() -ptm)
  
  ptm <- proc.time()
  getAllData(filePath,jpsurvDataString)
  print("Calculation time")
  print(proc.time() -ptm)
  print("return from getAllData")
  
  return
  # getFullDataDownloadWrapper(filePath,jpsurvDataString)
  
}
getAllData<- function(filePath,jpsurvDataString)
{
  
  print("calculating jointpoint")
  jpsurvData <<- fromJSON(jpsurvDataString)
  print("Creating json")
  ModelEstimate=getJointtModelWrapper(filePath,jpsurvDataString)
  ModelSelection=geALLtModelWrapper(filePath,jpsurvDataString)
  Coefficients=getcoefficientsWrapper(filePath,jpsurvDataString)
  
  ptm <- proc.time()
  IntGraph=getRelativeSurvivalByIntWrapper(filePath,jpsurvDataString)
  print("Int Graph Time:")
  print(proc.time() -ptm)
  
  ptm <- proc.time()
  YearGraph=getRelativeSurvivalByYearWrapper(filePath,jpsurvDataString)
  print("Year Graph Time:")
  print(proc.time() -ptm)
  
  JP=getJPWrapper(filePath,jpsurvDataString)
  
  Selected_Model=getSelectedModel(filePath,jpsurvDataString)
  
  Full_data=getFullDataDownload(filePath,jpsurvDataString)
  
  jsonl =c(IntGraph,YearGraph,ModelEstimate,Coefficients,"ModelSelection" = ModelSelection, "JP"=JP,"SelectedModel"=Selected_Model,"Full_Data_Set"=Full_data) #returns
  exportJson <- toJSON(jsonl)
  
  #print (jsonl)
  print("Creating results file")
  filename = paste(filePath, paste("results-", jpsurvData$tokenId, ".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
  # return (jsonl)
}
getTrendsData<-function(filePath,jpsurvDataString)
{
  ptm <- proc.time()
  jpsurvData <<- fromJSON(jpsurvDataString)
  Trends=getTrendWrapper(filePath,jpsurvDataString)
  print("Trends Time:")
  print(proc.time() -ptm)
  jsonl =c(Trends) #returns
  exportJson <- toJSON(jsonl)
  print("Creating  trends results file")
  filename = paste(filePath, paste("trend_results-", jpsurvData$tokenId, ".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
}

#Creates the SEER Data and Fitted Result
getFittedResult <- function (filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange, allVars, cohortVars, cohortValues, covariateVars, numJP, adanced_options,delLastIntvlAdv,outputFileName,jpsurvDataString) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  print ("creating RDS")
  print (numJP)
  file=paste(filePath, seerFilePrefix, sep="/" )
  
  varLabels=getCorrectFormat(allVars)
  seerdata = joinpoint.seerdata(seerfilename=file,
                                newvarnames=varLabels,
                                NoFit=T,
                                UseVarLabelsInData=varLabels)
  
  subsetStr=getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
  #assign subsetStr in the global in order for eval(parse(text=)) to work
  assign("subsetStr", subsetStr, envir = .GlobalEnv)
  
  factorStr=getFactorStr(covariateVars)
  assign("factorStr", factorStr, envir= .GlobalEnv)
  print(factorStr)
  statistic=jpsurvData$additional$statistic
  
  if (statistic=="Relative Survival")
  {
    statistic="Relative_Survival_Cum"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CauseSpecific_Survival_Cum"
  }
  
  fittedResult=joinpoint(seerdata,
                         subset = eval(parse(text=subsetStr)),
                         year=getCorrectFormat(yearOfDiagnosisVarName),
                         observedrelsurv=statistic,
                         model.form = ~NULL,
                         op=adanced_options,
                         delLastIntvl=delLastIntvlAdv,
                         maxnum.jp=numJP);
  #save seerdata and fit.result as RData
  cat("***outputFileName")
  cat(outputFileName)
  #cat("\n")
  print(outputFileName)
  outputData=list("seerdata"=seerdata, "fittedResult"=fittedResult)
  
  iteration=jpsurvData$plot$static$imageId
  downloadFile=paste(filePath, paste("Full_data-", jpsurvData$tokenId, "-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  
  print ("saving RDS")
  saveRDS(outputData, outputFileName)
  #getFullDataDownload(seerdata, fittedResult, subsetStr, downloadFile, 0)
  
  
}
getFullDataDownload <- function(filePath,jpsurvDataString) {
  jpsurvData=fromJSON(jpsurvDataString)
  iteration=jpsurvData$plot$static$imageId
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  Full_Data=outputData$fittedResult$fullpredicted
  
  cohorts=jpsurvData$calculate$form$cohortVars
  
  for (i in length(cohorts):1)
  {
    value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
    value=noquote(value)
    Full_Data[cohorts[[i]]] <- value
    
    #col_idx <- grep(cohorts[[i]], names(Full_Data))
    col_idx=ncol(Full_Data)
    Full_Data <- Full_Data[, c(col_idx, (1:ncol(Full_Data))[-col_idx])]
    names(Full_Data)
  }  
  print ("FULL PREDICTED")
  downloadFile = paste(filePath, paste("Full_Predicted-", jpsurvData$tokenId, "-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  write.csv(Full_Data, downloadFile, row.names=FALSE)
  return (downloadFile)
  
}

#Graphs the Survival vs year graph and saves a csv file of the data
getRelativeSurvivalByYearWrapper <- function (filePath,jpsurvDataString) {
  
  jpsurvData=fromJSON(jpsurvDataString)
  statistic=jpsurvData$additional$statistic
  if (statistic=="Relative Survival")
  {
    statistic="R"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CS"
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  intervals=c()
  for(i in 1:length(jpsurvData$additional$intervals)) 
  {
    intervals=c(intervals,jpsurvData$additional$intervals[[i]])
  }
  #  intervals = jpsurvData$plot$form$intervals #<-----new
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  jpInd=jpsurvData$additional$headerJoinPoints
  cohortValues = c()
  NAs=c()
  for(i in 1:length(jpsurvData$cohortValues)) 
  {
    cohortValues=c(cohortValues,jpsurvData$cohortValues[[i]])
    NAs=c(NAs,NA)
  }
  
  #take the nth from FitList
  iteration=jpsurvData$plot$static$imageId
  fit.result=outputData$FitList[jpInd+1]
  png(filename = paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/"))
  graphFile= paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Year-", jpsurvData$tokenId, "-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  survData=plot.surv.year(outputData$fittedResult$FitList[[jpInd+1]],intervals, NAs, NAs,statistic,"Survival vs Year of Diagnosis")
  dev.off()
  results =c("RelSurYearGraph"=graphFile,"RelSurvYearData"=survData) #returns 
  cohorts=jpsurvData$calculate$form$cohortVars
  cols=ncol(survData)
  for (i in length(cohorts):1)
  {
    value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
    value=noquote(value)
    survData[cohorts[[i]]] <- value
    
    #col_idx <- grep(cohorts[[i]], names(survData))
    col_idx=ncol(survData)
    print(ncol(survData))
    survData <- survData[, c(col_idx, (1:cols)[-col_idx])]
    names(survData)
  }  
  
#  print(survData)
  write.csv(survData, downloadFile, row.names=FALSE)
  return (results)
  
  
}
#Graphs the Survival vs Time graph and saves a csv file of the data
getRelativeSurvivalByIntWrapper <- function (filePath,jpsurvDataString) {
  
  jpsurvData=fromJSON(jpsurvDataString)
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  statistic=jpsurvData$additional$statistic
  
  if (statistic=="Relative Survival")
  {
    statistic="R"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CS"
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosis = jpsurvData$additional$yearOfDiagnosis
  iteration=jpsurvData$plot$static$imageId
  
  png(filename = paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/"))
  graphFile= paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Int-", jpsurvData$tokenId, "-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)
  survData=plot.surv.int(outputData$fittedResult$FitList[[jpInd+1]], yearOfDiagnosisVarName, yearOfDiagnosis,statistic);
  #survData=plot.relsurv.int(outputData$fittedResult$FitList[[jpInd+1]], "Year_of_diagnosis_7507_individual", 1975);
  print (yearOfDiagnosisVarName)
  dev.off()
  results =c("RelSurIntData"=survData,"RelSurIntGraph"=graphFile) #returns 
  cohorts=jpsurvData$calculate$form$cohortVars
  survData=survData[[1]]
 for (i in length(cohorts):1)
  {
    value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
    value=noquote(value)
    survData[cohorts[[i]]] <- value
    
    #col_idx <- grep(cohorts[[i]], names(survData))
    col_idx=ncol(survData)
    survData <- survData[, c(col_idx, (1:ncol(survData))[-col_idx])]
    names(survData)
  }  
  print(survData)
  write.csv(survData, downloadFile, row.names=FALSE)
  
  return (results)
}


#Gets the coefficients table in the Model Estimates tab
getcoefficientsWrapper <- function (filePath,jpsurvDataString) {
  jpsurvData=fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  coefficients=outputData$fittedResult$coefficients
  Xvector=paste(rownames(coefficients),collapse=", ")
  length=length(coefficients)/2
  Estimates=paste(coefficients[1:length,1],collapse=", ")
  Std_Error=paste(coefficients[1:length,2],collapse=", ")
  
  results= c("Xvectors"=Xvector,"Estimates"=Estimates,"Std_Error"=Std_Error)
  return(results)
}

#gets all the model selection info for all joint points
geALLtModelWrapper <- function (filePath,jpsurvDataString) {
  jpsurvData=fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  jsonl=list()
  saved=outputData$fittedResult$FitList
  joints=list()
  ModelSelection=list()
  for(i in 1:length(saved)) 
  {
    name=paste0("joinpoint",i)
    aicJson=saved[[i]]$aic
    bicJson=saved[[i]]$bic
    llJson=saved[[i]]$ll
    convergedJson=saved[[i]]$converged
    joints[[name]]=list("aic"=aicJson, "bic"=bicJson, "ll"=llJson, "converged"=convergedJson)
    
  }
  ModelSelection=joints
  jsonl=toJSON(ModelSelection)
  
  return (jsonl)
}

#gets all the model selection info for all joint points
getJointtModelWrapper <- function (filePath,jpsurvDataString) {
  jpsurvData=fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  jsonl=c()
  saved=outputData$fittedResult$FitList
  aicJson=paste(toJSON(saved[[jpInd+1]]$aic))
  bicJson=paste(toJSON(saved[[jpInd+1]]$bic))
  llJson=paste(toJSON(saved[[jpInd+1]]$ll))
  convergedJson=paste(toJSON(saved[[jpInd+1]]$converged))
  jsonl =c("aic"=aicJson, "bic"=bicJson, "ll"=llJson, "converged"=convergedJson)
  
  return (jsonl)
}


getTrendWrapper<- function (filePath,jpsurvDataString) {
  jsonl=c()
  jpsurvData=fromJSON(jpsurvDataString)
  fileName=paste("output-", jpsurvData$tokenId,".rds", sep="")
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  file=paste(filePath, fileName, sep="/" )
  outputData=readRDS(file)
  jpInd=as.integer(jpsurvData$additional$headerJoinPoints)
  trend_types=c("HAZ_APC","CS_AAPC","CS_AAAC")
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  outputData=readRDS(file)
  
  file=paste(filePath, fileName, sep="/" )
  trend1=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="CS_AAPC"))
  trend2=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="CS_AAAC"))
  trend3=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="HAZ_APC"))
  jsonl =c("CS_AAPC"=trend1,"CS_AAAC"=trend2,"HAZ_APC"=trend3)
  
  return(jsonl)
  
}
getJPWrapper<-function(filePath,jpsurvDataString)
{
  jpsurvData=fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  JP=outputData$fittedResult$jp
  return(JP)
}

getSelectedModel<-function(filePath,jpsurvDataString)
{
  jpsurvData=fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  selected=outputData$fittedResult$X1names[[1]]
  point=as.integer(strsplit(selected, "_")[[1]][2])+1
  return(point)
}
