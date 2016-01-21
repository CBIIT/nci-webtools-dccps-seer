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
  getFittedResult(filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange, allVars, cohortVars, cohortValues, covariateVars, numJP,adanced_options, delLastIntvl, outputFileName,jpsurvDataString)
  getAllData(filePath,jpsurvDataString)
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
  IntGraph=getRelativeSurvivalByIntWrapper(filePath,jpsurvDataString)
  YearGraph=getRelativeSurvivalByYearWrapper(filePath,jpsurvDataString)
  Trends=getTrendWrapper(filePath,jpsurvDataString)
  JP=getJPWrapper(filePath,jpsurvDataString)
  jsonl =c(IntGraph,YearGraph,ModelEstimate,Coefficients,Trends,"ModelSelection" = ModelSelection, "JP"=JP) #returns
  exportJson <- toJSON(jsonl)
  print (jsonl)
  print("Creating results file")
  filename = paste(filePath, paste("results-", jpsurvData$tokenId, ".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
  # return (jsonl)
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
  fittedResult=joinpoint(seerdata,
                         subset = eval(parse(text=subsetStr)),
                         year=getCorrectFormat(yearOfDiagnosisVarName),
                         observedrelsurv="Relative_Survival_Cum",
                         model.form = eval(parse(text=factorStr)),
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
getFullDataDownload <- function(seerdata, fittedResult, subsetStr, downloadFile, jpInd) {
  downloadOutput = output.overview(as.vector(outputData$seerdata), as.vector(outputData$fittedResult$FitList[[jpInd+1]]), subsetStr);
  write.csv(downloadOutput, downloadFile)
}

#Graphs the Survival vs year graph and saves a csv file of the data
getRelativeSurvivalByYearWrapper <- function (filePath,jpsurvDataString) {
  
  jpsurvData=fromJSON(jpsurvDataString)
  
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
  survData=plot.relsurv.year(outputData$fittedResult,intervals, NAs, cohortValues)
  for (key in names(survData)) write.table(survData[[key]], file=downloadFile, append=T)
  
  dev.off()
  results =c("RelSurYearGraph"=graphFile,"RelSurvYearData"=survData) #returns 
  return (results)
  
  
}
#Graphs the Survival vs Time graph and saves a csv file of the data
getRelativeSurvivalByIntWrapper <- function (filePath,jpsurvDataString) {
  
  jpsurvData=fromJSON(jpsurvDataString)
  jpInd=jpsurvData$additional$headerJoinPoints
  # jpind=jpsurvData$calculate$form$jpInd #<-----new
  
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosis = jpsurvData$calculate$form$yearOfDiagnosisRange[[1]]
  iteration=jpsurvData$plot$static$imageId
  
  downloadFile = paste(filePath, paste("data_Int-", jpsurvData$tokenId,".csv", sep=""), sep="/") #CSV file to download
  png(filename = paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/"))
  graphFile= paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Int-", jpsurvData$tokenId, "-",iteration, ".txt", sep=""), sep="/") #CSV file to download
  survData=plot.relsurv.int(outputData$fittedResult$FitList[[jpInd+1]], yearOfDiagnosisVarName, yearOfDiagnosis);
  for (key in names(survData)) write.table(survData[[key]], file=downloadFile, append=T)
  dev.off()
  results =c("RelSurIntData"=survData,"RelSurIntGraph"=graphFile) #returns 
  
  return (results)
}
testData = list()
# getFullDataDownloadWrapper <- function (filePath, jpsurvDataString) {
#   #print("R: getDownloadOutputWrapper")
#   jpsurvData = fromJSON(jpsurvDataString)
#   #print(jpsurvData)
# 
#   #seerFilePrefix = jpsurvData$calculate$static$seerFilePrefix
#   yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
#   yearOfDiagnosisRange = jpsurvData$calculate$form$yearOfDiagnosisRange
#   #allVars=jpsurvData$calculate$static$allVars
#   cohortVars=jpsurvData$calculate$form$cohortVars
#   cohortValues=jpsurvData$calculate$form$cohortValues
#   #covariateVars=jpsurvData$calculate$form$covariateVars
#   #maxJP=jpsurvData$calculate$form$joinPoints
#   subsetStr=getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
#   assign("subsetStr", subsetStr, envir = .GlobalEnv)
# 
#   fileName = paste('link', jpsurvData$tokenId, sep="-" )
#   fileName = paste(fileName, "rds", sep="." )
#  
#   #outputFileName = fileName
# 
#   fileName = paste('link', jpsurvData$tokenId, sep="-" )
#   fileName = paste(fileName, "rds", sep="." )
#   outputFileName =paste(filePath, fileName, sep="/" )
# 
#   outFile=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
#   downloadFile=paste("link-", jpsurvData$tokenId,".csv", sep="")
# 
#   downloadFile=paste(filePath, paste(filePath, downloadFile, sep="/" ), sep="/")
# 
#   return (downloadFile)
# }


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
