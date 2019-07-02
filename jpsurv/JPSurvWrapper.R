library("rjson")
library("JPSurv")
library("ggplot2")

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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  csvdata <- read.tabledata(fileName=file.path(path, inputFile),  # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);                             # hasHeader: Boolean variable indicating whether or not the CSV being read in has a header row or not. Default is FALSE.
  dictionaryCols=c()
  if( length(cohorts) > 0) {
    dictionaryCols = c(cohorts,year,interval)
  } else {
    dictionaryCols = c(year,interval)
  }
  seerFormData=write.tabledic(inputData=csvdata,          # inputData: Input data.frame.
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
    seerdata=read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);    
    observed=names(seerdata)[jpsurvData$additional$observed]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    input_type="csv"
    died=names(seerdata)[jpsurvData$additional$died]
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    observed=names(seerdata)[jpsurvData$additional$observed]
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
  YearGraph=getRelativeSurvivalByYearWrapper(filePath,jpsurvDataString,first_calc,com,interval,observed,use_default)
  IntGraph=getRelativeSurvivalByIntWrapper(filePath,jpsurvDataString,first_calc,com,interval,observed,use_default)
  ModelSelection=geALLtModelWrapper(filePath,jpsurvDataString,com)
  Coefficients=getcoefficientsWrapper(filePath,jpsurvDataString,first_calc,com)
  JP=getJPWrapper(filePath,jpsurvDataString,first_calc,com)
  Selected_Model=getSelectedModel(filePath,jpsurvDataString,com)
  statistic = jpsurvData$additional$statistic
  obsintvar = ''
  if (statistic=="Relative Survival") {
    obsintvar = 'Relative_Survival_Interval'
    statistic="Relative_Survival_Cum"
  } else if (statistic=="Cause-Specific Survival") {
    obsintvar = 'CauseSpecific_Survival_Interval'
    statistic="CauseSpecific_Survival_Cum" 
  }
  jpInd=jpsurvData$additional$headerJoinPoints
  if (is.null(jpInd)) {
    jpInd = getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  # get year column var name
  yearVar = getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)  
  # create datasets for download
  fullDownload <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, interval, 'full')
  deathGraphData <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, interval, 'death')
  survGraphDownload <- downloadDataWrapper(jpsurvDataString, filePath, com, yearVar, jpInd, interval, 'survive')
  # create graphs
  deathGraph <- getDeathByYearWrapper(filePath, jpsurvDataString, first_calc, com, interval, observed = obsintvar, use_default, deathGraphData)
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
  jsonl =list("IntData" = IntGraph,
              "YearData" = YearGraph,
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
              "survGraphDownload" = survGraphDownload,
              "deathGraphData" = deathGraphData,
              "fullDownload" = fullDownload) #returns
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("results-", jpsurvData$tokenId,"-",com,"-",jpInd, ".json", sep=""), sep="/") 
  write(exportJson, filename)
}

getTrendsData<-function(filePath,jpsurvDataString,com) {
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
                           subset = eval(parse(text=subsetStr)),
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
    seerdata=read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                            hasHeader=TRUE,
                            dlm=del);      
    intervalRange = as.integer(jpsurvData$calculate$form$interval)
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    observed=names(seerdata)[jpsurvData$additional$observed]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    died=names(seerdata)[jpsurvData$additional$died]
    fittedResult <- joinpoint(seerdata, 
                              subset = eval(parse(text=subsetStr)),
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
  # transform data to percent
  outputData = scaleTo(outputData, 'percent')
  iteration=jpsurvData$plot$static$imageId
  saveRDS(outputData, outputFileName)
}

#Graphs the Survival vs year graph and saves a csv file of the data
getRelativeSurvivalByYearWrapper <- function (filePath,jpsurvDataString,first_calc,com,interval_var,observed,use_default=TRUE) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  statistic=jpsurvData$additional$statistic
  type=""
  if (statistic=="Relative Survival") {
    statistic="R"
    type="Relative"
  } else if (statistic=="Cause-Specific Survival") {
    statistic="CS"
    type="Cause-Specific"
  }
  jpInd=jpsurvData$additional$headerJoinPoints
  if (first_calc==TRUE||is.null(jpInd)) {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")  
  outputData=readRDS(file)
  intervals=c()
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosis = jpsurvData$additional$yearOfDiagnosis
  if (use_default==FALSE) {
    for (i in 1:length(jpsurvData$additional$intervals)) {
      intervals=c(intervals,jpsurvData$additional$intervals[[i]])
    }
  }
  else {
    yearOfDiagnosis=yearOfDiagnosis=jpsurvData$additional$yearOfDiagnosis_default
    for (i in 1:length(jpsurvData$additional$intervals_default)) {
      intervals=c(intervals,jpsurvData$additional$intervals_default[[i]]) 
    }
  }
  yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)
  cohortValues = c()
  NAs=c()
  for (i in 1:length(jpsurvData$cohortValues)) {
    cohortValues=c(cohortValues,jpsurvData$cohortValues[[i]])
    NAs=c(NAs,NA)
  }
  #take the nth from FitList
  iteration=jpsurvData$plot$static$imageId
  fit.result=outputData$FitList[jpInd+1]
  graphFile= paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Year-", jpsurvData$tokenId, "-",com,"-",jpInd,"-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)
  survData <- data.plot.surv.year(outputData$fittedResult$FitList[[jpInd+1]],
                                  int.col=intervals, 
                                  interval=interval_var)
  maxyear <- max(survData[[yearOfDiagnosisVarName]])
  # calculate difference in cumulative survival between a calendar year and one year prior
  survData$diff <- survData$pred_cum / lag(survData$pred_cum)
  # remove every 2 row entries so to not clutter the graph with labels
  if (length(survData$diff) > 2) {
    survData$diff[c(T, T, T, T , F)] <- NA
  } 
  #JP Trendgraph
  ggplot(survData, aes(x=survData[[yearOfDiagnosisVarName]], group=survData[[interval_var]], colour=factor(survData[[interval_var]]))) + 
    geom_line(aes(y=pred_cum)) + 
    geom_point(aes(y=survData[[observed]])) +
    geom_text(aes(label = ifelse(is.na(survData[['diff']]), '', round(survData[['diff']], 2)), 
      x=survData[[yearOfDiagnosisVarName]], y=survData[['pred_cum']]),
      hjust = 0, vjust = -1.9, size = 5) +
    labs(title="Cumulative Survival - Absolute Change",
         x="Year of Diagnosis",
         y=paste("Cumulative",type,"Survival %", sep=" ")) +
    scale_x_continuous(breaks=seq(0,maxyear,5)) +
    scale_y_continuous(breaks=seq(0,100,10),limits = c(0, 100)) +
    labs(colour=interval_var)+
    theme(legend.position="bottom", 
            legend.title=element_blank(),
            plot.title = element_text(hjust = 0.5,face = "bold",size=18,vjust=0.5,margin = margin(0, 0, 10, 0, 'pt')),
            axis.title=element_text(size=15),
            axis.title.x = element_text(margin = unit(c(10, 0, 0, 0), "mm")),
            axis.title.y = element_text(margin = unit(c(0, 10, 0, 0), "mm")),
            axis.text = element_text(size=11.5),
            legend.text=element_text(size=11.5))
  ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"))
  results = list("RelSurYearGraph"=graphFile,"RelSurvYearData"=survData) #returns 
  return(results)  
}

#Graphs the Survival vs Time graph and saves a
getRelativeSurvivalByIntWrapper <- function (filePath,jpsurvDataString,first_calc,com,interval_var,survar_var,use_default_year=TRUE) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  statistic=jpsurvData$additional$statistic
  type=""
  if (statistic=="Relative Survival") {
    statistic="R"
    type="Relative"
  } else if (statistic=="Cause-Specific Survival") {
    statistic="CS"
    type="Cause-Specific"
  }
  jpInd=jpsurvData$additional$headerJoinPoints
  if (first_calc==TRUE||is.null(jpInd)) {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosis = jpsurvData$additional$yearOfDiagnosis
  if (use_default_year==TRUE) {
    yearOfDiagnosis=jpsurvData$additional$yearOfDiagnosis_default
  }
  iteration=jpsurvData$plot$static$imageId
  graphFile= paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Int-", jpsurvData$tokenId,"-",com,"-",jpInd, "-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)
  survData=data.plot.surv.int(outputData$fittedResult$FitList[[jpInd+1]],
                            yearvar=yearOfDiagnosisVarName,
                            year=yearOfDiagnosis,
                            interval=interval_var,
                            survvar=survar_var);
  # multiply first row values by 100
  survData = fixIntGraph(survData)
  maxint <- max(survData[[1]][[interval_var]])
  #From package, interval graph
  ggplot(survData[[1]], aes(x=survData[[1]][[interval_var]])) + 
      geom_line(aes(y=pred_cum, colour="pred_cum")) + 
      geom_point(aes(y=survData[[1]][[survar_var]], colour=survar_var)) +
      labs(title=paste("Cumulative",type,"Survival by Interval for", yearOfDiagnosis, sep=" "),
           x=interval_var,
           y=paste("Cumulative",type,"Survival", sep=" ")) +
      scale_x_continuous(breaks=seq(0,maxint, if (length(survData[[1]][[interval_var]]) <= 12) 1 else  2)) +
      coord_cartesian(ylim=c(0,100)) +
      scale_y_continuous(breaks=seq(0,100,10)) +
      scale_colour_discrete(breaks=c("pred_cum", survar_var),
                            labels=c(paste("Predicted Cumulative",type,"Survival", sep=" "), paste("Observed Cumulative",type,"Survival", sep=" "))) +
      theme(legend.position="bottom", 
            legend.title=element_blank(),
            plot.title = element_text(hjust = 0.5,size=22,face = "bold",vjust=0.5,margin = margin(0, 0, 10, 0, 'pt')),
            axis.title=element_text(size=20),
            axis.title.x = element_text(margin = unit(c(10, 0, 0, 0), "mm")),
            axis.text = element_text(size=14.5),
            axis.title.y = element_text(margin = unit(c(0, 10, 0, 0), "mm")),
            legend.text=element_text(size=14.5))
  ggsave(file=paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"),width = 10, height = 8)
# ggsave(file=paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"))
  results =c("RelSurIntData"=survData,"RelSurIntGraph"=graphFile) #returns 
  return(results)
}

#Gets the coefficients table in the Model Estimates tab
getcoefficientsWrapper <- function (filePath,jpsurvDataString,first_calc,com) {
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
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
  jpsurvData <<- fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)  
  model=length(outputData$fittedResult$jp)+1
  return(model)
}

# Creates a string containing each cohort combination, each combination is sperated by a , and each cohort seperated by a +
#ex: ch1 + ch2 + ch3, ch1 + ch2 + ch4
getRunsString<-function(filePath,jpsurvDataString){
  jpsurvData <<- fromJSON(jpsurvDataString)
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

# modify data scaling by 100 for display as percentage or calculation
scaleTo <- function(data, type) {
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
              'Predicted_Int',
              'Predicted_Cum',
              'Predicted_Int_SE',
              'Predicted_Cum_SE',
              'pred_cum',
              'pred_cum_se',
              'pred_int',
              'pred_int_se')
  for (col in columns) {
    if (type == 'percent') { # scale input and output data by 100 to display as percent
      if (!is.null(data$seerdata[[col]])) {
        data$seerdata[[col]] <- data$seerdata[[col]] * 100
      }
      for (nJP in 1:length(data$fittedResult$FitList)) {
         if (!is.null(data$fittedResult$FitList[[nJP]]$predicted[[col]])) {
          data$fittedResult$FitList[[nJP]]$predicted[[col]] <- data$fittedResult$FitList[[nJP]]$predicted[[col]] * 100
          data$fittedResult$FitList[[nJP]]$fullpredicted[[col]] <- data$fittedResult$FitList[[nJP]]$fullpredicted[[col]] * 100
        }
      }
    } else { # scale back to decimal for plotting graphs
      if (!is.null(data[[col]])) {
        data[[col]] <- data[[col]] / 100
      }
      for (nJP in 1:length(data$fittedResult$FitList)) {
         if (!is.null(data$fittedResult$FitList[[nJP]]$predicted[[col]])) {
          data$fittedResult$FitList[[nJP]]$predicted[[col]] <- data$fittedResult$FitList[[nJP]]$predicted[[col]] / 100
          data$fittedResult$FitList[[nJP]]$fullpredicted[[col]] <- data$fittedResult$FitList[[nJP]]$fullpredicted[[col]] / 100
        }
      }
    }
  }
  return(data)
}

# transform first row of int graph to percent from decimal 
fixIntGraph <- function(graph) {
  graph[[1]]$Relative_Survival_Cum[1] <- graph[[1]]$Relative_Survival_Cum[1] * 100
  graph[[1]]$CauseSpecific_Survival_Cum[1] <- graph[[1]]$CauseSpecific_Survival_Cum[1] * 100
  graph[[1]]$pred_cum[1] <- graph[[1]]$pred_cum[1] * 100
  return(graph)
}

downloadDataWrapper <- function(jpsurvDataString, filePath, com, yearVar, jpInd, interval, downloadtype) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  file = paste(filePath, paste("output-", jpsurvData$tokenId, "-", com, ".rds", sep = ""), sep = "/")
  outputData = readRDS(file)    
  input = outputData[['seerdata']]
  fit = outputData[['fittedResult']]
  yearOfDiagnosisRange = jpsurvData$calculate$form$yearOfDiagnosisRange
  cohortVars = jpsurvData$calculate$form$cohortVars
  cohortValues = jpsurvData$calculate$form$AllcohortValues
  subsetStr = getSubsetStr(yearVar, yearOfDiagnosisRange, cohortVars, cohortValues)
  intervals = c()
  if (downloadtype == 'survival') {
    for (i in 1:length(jpsurvData$additional$intervals)) {
      intervals = c(intervals,jpsurvData$additional$intervals[[i]])
    } 
    return (download.data(input, fit, jpInd, yearVar, downloadtype="graph", interval = interval, int.col = intervals, subset = subsetStr))
  } else if (downloadtype == 'death') {
     for (i in 1:length(jpsurvData$additional$intervalsDeath)) {
      intervals = c(intervals,jpsurvData$additional$intervalsDeath[[i]])
    } 
    return (download.data(input, fit, jpInd, yearVar, downloadtype="graph", interval = interval, int.col = intervals, subset = subsetStr))
  } else {
    return (download.data(input, fit, jpInd, yearVar, downloadtype="full", interval = interval, subset = subsetStr))
  }
}

# Graphs the Death vs Year graph
getDeathByYearWrapper <- function (filePath, jpsurvDataString, first_calc, com, interval, observed, use_default, graphData) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  iteration = jpsurvData$plot$static$imageId
  yearVar = getCorrectFormat(jpsurvData$calculate$static$yearOfDiagnosisVarName)
  nJP = jpsurvData$additional$headerJoinPoints
  if (first_calc == TRUE || is.null(nJP)) {
    nJP = getSelectedModel(filePath, jpsurvDataString, com) - 1
  }
  # scale data back to decimal
  data = paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData = readRDS(data)
  scaleOutput = scaleTo(outputData, 'decimal')
  fit = scaleOutput[['fittedResult']]
  scaleGraph = scaleTo(graphData, 'decimal')
  annotation = 0
  if (nJP <= 3 && length(jpsurvData$additional$intervalsDeath) <= 3) {
    annotation = 1
  }
  # create graph
  graph = plot.dying.year.annotate(scaleGraph, fit, nJP, yearVar, observed, predintvar="Predicted_Int", interval, annotation)
  graphFile = paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/")
  ggsave(file=paste(filePath, paste("plot_Death-", jpsurvData$tokenId,"-",com,"-",nJP,"-",iteration,".png", sep=""), sep="/"), plot = graph)
  results = list("deathGraph" = graphFile, "deathData" = graphData)
}

#########################################################################################################
# download.data: a function that returns a merged data set for download including 
# - the selected cohort input data
# - the accompanying data for plot.surv.year/plot.dying.year
# arguments:
# input - input dataset read in by function joinpoint.seerdata.
# fit - joinpoint object containing the model output.
# nJP - the number of joinpoints in the model.
# yearvar - the variable name for year of diagnosis used in argument 'year' of the function joinpoint.
# type - two options for this argument: "graph" for graph data and "full" for full data.
# subset - an optional string specifying a subset of observations used in the fitting process.
# interval - the variable name for year since diagnosis. The default is 'Interval'.
# int.col - the interval values selected for the plot if the downloadtype="graph". The default is NULL.
#########################################################################################################
download.data<-function(input,fit,nJP,yearvar,downloadtype,subset=NULL,interval="Interval",int.col=NULL){
  input.sub<-subset(input,eval(parse(text=subset)))
  if(downloadtype=="graph"){
    output.sub<-fit$FitList[[nJP+1]]$predicted
    if(!is.null(int.col)){
      output.sub<-output.sub[which(output.sub[,interval] %in% int.col),]
    }
  }else if(downloadtype=="full"){
    output.sub<-fit$FitList[[nJP+1]]$fullpredicted
  }else{
    break
  }
  yearint.input<-paste(input.sub[,yearvar],input.sub[,interval],sep="_")
  yearint.output<-paste(output.sub[,yearvar],output.sub[,interval],sep="_")
  rows.match<-match(yearint.output,yearint.input)
  cols.input<-colnames(input.sub)
  del.cols<-c("Page_type","Observed_SE_Interval","Observed_SE_Cum")
  cols.input<-cols.input[-which(cols.input %in% del.cols)]
  cols.output<-colnames(output.sub)
  merge.sub<-output.sub
  merge.sub[,cols.input]<-input.sub[rows.match,cols.input]
  merge.data<-merge.sub[,c(cols.input,"pred_int","pred_cum","pred_int_se","pred_cum_se")]
  pred.cols<-c("Predicted_Int","Predicted_Cum","Predicted_Int_SE","Predicted_Cum_SE")
  colnames(merge.data)[(length(colnames(merge.data))-3):length(colnames(merge.data))]<-pred.cols
  if(downloadtype=="full"){
    merge.data[,yearvar]<-output.sub[,yearvar]
    merge.data[,interval]<-output.sub[,interval]
    subsetStr.list<-strsplit(subsetStr, " & ")
    subsetStr.list[[1]]<-subsetStr.list[[1]][which(grepl("==", subsetStr.list[[1]])==T)]
    cohort.list<-strsplit(subsetStr.list[[1]], "==")
    cohort.vars<-sapply(cohort.list, "[", 1)
    cohort.vars<-gsub(" ","",cohort.vars)
    cohort.values<-sapply(cohort.list, "[", 2)
    cohort.values<-gsub(" ","",cohort.values)
    cohort.vars<-cohort.vars[which(!cohort.vars %in% c(yearvar,interval))]
    cohort.values<-cohort.values[which(!cohort.vars %in% c(yearvar,interval))]
    merge.data[,cohort.vars]<-t(replicate(dim(merge.data)[1],cohort.values))
  }
  merge.data[,yearvar]<-as.numeric(merge.data[,yearvar])
  return(merge.data)
}

#########################################################################################################
# plot.dying.year.annotate: a function that returns a plot for Percent Change in the Annual Probability of
# Dying of Cancer by Diagnosis year using ggplot
# The annotation feature is available for nJP<=3 and the number of multiple intervals selected <=3
# arguments:
# plotdata - the graph data returned by function download.data with downloadtype="graph".
# fit - joinpoint object containing the model output.
# nJP - the number of joinpoints in the model.
# yearvar - the variable name for year of diagnosis used in argument 'year' of the function joinpoint.
# obsintvar - the variable name for observed interval survival. The default is "Relative_Survival_Interval"
#             for relative survival data. For cause-specific data, it needs to be changed accordingly.
# predintvar - the variable name for predicted interval survival.
# interval - the variable name for year since diagnosis. The default is 'Interval'.
# annotation - the indicator for annotation feature. The default is 0 (no annotation on the plot).
#########################################################################################################
### define a plot function for Percent Change in the Annual Probability of Dying of Cancer by Diagnosis year with annotations
plot.dying.year.annotate<-function(plotdata,fit,nJP,yearvar,obsintvar="Relative_Survival_Interval",predintvar="Predicted_Int",interval="Interval",annotation=0){
  title.rch<-"Percent Change in the Annual Probability of Dying of Cancer \n by Diagnosis Year"
  interval.values<-as.numeric(unique(plotdata[,"Interval"]))
  interval.labels<-paste((interval.values-1)," to ",interval.values," years since diagnosis",sep="")
  if(interval.values[1]==1){
    interval.labels[1]<-"0 to 1 year since diagnosis"
  }
  if(annotation==1){  
    if(length(interval.values)<=3 & nJP<=3){
      ### haz results are the same for all interval values
      jp.loc<-fit$FitList[[nJP+1]]$jp
      haz.apc<-aapc(fit$FitList[[nJP+1]], type="RelChgHaz", interval=interval.values[1])
      annot.strs<-paste(sprintf("%.1f",100*haz.apc$estimate),"%",sep="")
      x.values<-list()
      y.values<-list()
      for(i in 1:length(interval.values)){
        int.i<-interval.values[i]
        plotdata.i<-plotdata[which(plotdata[,interval]==int.i),]
        if(max(plotdata.i[,yearvar])==max(haz.apc$end.year) | nJP==0){
          end.year<-haz.apc$end.year
          end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
          y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                             (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
          x.values.i<-1/2*(haz.apc$start.year+end.year)
        }
        if(max(plotdata.i[,yearvar])<max(haz.apc$end.year)){
          if(nJP==1){
            if(max(plotdata.i[,yearvar])>jp.loc){
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            }else{
              haz.apc<-haz.apc[1:nJP,]
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+haz.apc$end.year)
            }
          } ## nJP=1 end
          if(nJP==2){
            if(max(plotdata.i[,yearvar])>max(jp.loc)){
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            } else if(max(plotdata.i[,yearvar])<=max(jp.loc) & max(plotdata.i[,yearvar])>min(jp.loc)){
              haz.apc<-haz.apc[1:nJP,]
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+haz.apc$end.year)
            } else{
              haz.apc<-haz.apc[1:(nJP-1),]
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            }
          } ## nJP=2 end
          if(nJP==3){
            if(max(plotdata.i[,yearvar])>max(jp.loc)){
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            } else if(max(plotdata.i[,yearvar])<=max(jp.loc) & max(plotdata.i[,yearvar])>jp.loc[2]){
              haz.apc<-haz.apc[1:nJP,]
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            } else if(max(plotdata.i[,yearvar])<=jp.loc[2] & max(plotdata.i[,yearvar])>=jp.loc[1]){
              haz.apc<-haz.apc[1:(nJP-1),]
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            } else {
              haz.apc<-haz.apc[1:(nJP-2),]
              end.year<-haz.apc$end.year
              end.year[length(haz.apc$end.year)]<-max(plotdata.i[,yearvar])
              y.values.i<-1/2*((1-plotdata.i[which(plotdata.i[,yearvar] %in% haz.apc$start.year),predintvar])+
                                 (1-plotdata.i[which(plotdata.i[,yearvar] %in% end.year),predintvar]))
              x.values.i<-1/2*(haz.apc$start.year+end.year)
            }
          } ## nJP=3 end
        } 
        x.values[[i]]<-x.values.i
        y.values[[i]]<-y.values.i
      }## interval.values iteration end
      if(length(interval.values)==1){
        hues=seq(15,375,length=length(interval.values)+1)
        gg_color_hue<-hcl(h=hues,l=65,c=100)[1:length(interval.values)]
        plot<-ggplot(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval]))) + 
          geom_line(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])),linetype="solid")+
          geom_point(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,obsintvar], group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])))+
          xlab('Year at diagnosis') + ylab('Annual Probability of Cancer Death (%)')+
          ggtitle(title.rch) +
          coord_cartesian(ylim=c(0,1))+
          scale_y_continuous(breaks=seq(0,1,0.1),labels = scales::percent)+
          scale_x_continuous(breaks=seq(min(plotdata[,yearvar],na.rm=T),max(plotdata[,yearvar],na.rm=T),5))+
          scale_color_hue(labels = interval.labels)+
          theme(legend.position="bottom")+
          theme(legend.title=element_blank())+
          theme(plot.title = element_text(hjust = 0.5))+
          annotate("text", x = x.values[[1]][1], y = y.values[[1]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][2], y = y.values[[1]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][3], y = y.values[[1]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][4], y = y.values[[1]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[1])
      }
      if(length(interval.values)==2){
        hues=seq(15,375,length=length(interval.values)+1)
        gg_color_hue<-hcl(h=hues,l=65,c=100)[1:length(interval.values)]
        plot<-ggplot(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval]))) + 
          geom_line(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])),linetype="solid")+
          geom_point(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,obsintvar], group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])))+
          xlab('Year at diagnosis') + ylab('Annual Probability of Cancer Death (%)')+
          ggtitle(title.rch) +
          coord_cartesian(ylim=c(0,1))+
          scale_y_continuous(breaks=seq(0,1,0.1),labels = scales::percent)+
          scale_x_continuous(breaks=seq(min(plotdata[,yearvar],na.rm=T),max(plotdata[,yearvar],na.rm=T),5))+
          scale_color_hue(labels = interval.labels)+
          theme(legend.position="bottom")+
          theme(legend.title=element_blank())+
          theme(plot.title = element_text(hjust = 0.5))+
          annotate("text", x = x.values[[1]][1], y = y.values[[1]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][2], y = y.values[[1]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][3], y = y.values[[1]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][4], y = y.values[[1]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[2]][1], y = y.values[[2]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][2], y = y.values[[2]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][3], y = y.values[[2]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][4], y = y.values[[2]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[2])    
      }
      if(length(interval.values)==3){
        hues=seq(15,375,length=length(interval.values)+1)
        gg_color_hue<-hcl(h=hues,l=65,c=100)[1:length(interval.values)]
        plot<-ggplot(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval]))) + 
          geom_line(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])),linetype="solid")+
          geom_point(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,obsintvar], group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])))+
          xlab('Year at diagnosis') + ylab('Annual Probability of Cancer Death (%)')+
          ggtitle(title.rch) +
          coord_cartesian(ylim=c(0,1))+
          scale_y_continuous(breaks=seq(0,1,0.1),labels = scales::percent)+
          scale_x_continuous(breaks=seq(min(plotdata[,yearvar],na.rm=T),max(plotdata[,yearvar],na.rm=T),5))+
          scale_color_hue(labels = interval.labels)+
          theme(legend.position="bottom")+
          theme(legend.title=element_blank())+
          theme(plot.title = element_text(hjust = 0.5))+
          annotate("text", x = x.values[[1]][1], y = y.values[[1]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][2], y = y.values[[1]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][3], y = y.values[[1]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[1]][4], y = y.values[[1]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[1])+
          annotate("text", x = x.values[[2]][1], y = y.values[[2]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][2], y = y.values[[2]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][3], y = y.values[[2]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[2]][4], y = y.values[[2]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[2])+
          annotate("text", x = x.values[[3]][1], y = y.values[[3]][1]+0.03, label = annot.strs[1], colour=gg_color_hue[3])+
          annotate("text", x = x.values[[3]][2], y = y.values[[3]][2]+0.03, label = annot.strs[2], colour=gg_color_hue[3])+
          annotate("text", x = x.values[[3]][3], y = y.values[[3]][3]+0.03, label = annot.strs[3], colour=gg_color_hue[3])+
          annotate("text", x = x.values[[3]][4], y = y.values[[3]][4]+0.03, label = annot.strs[4], colour=gg_color_hue[3])
      }
    }
    if(length(interval.values)>3 | nJP>3){
      break
    }
  }
  if(annotation==0){
    plot<-ggplot(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval]))) + 
      geom_line(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,predintvar],group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])),linetype="solid")+
      geom_point(data=plotdata, aes(x=plotdata[,yearvar], y=1-plotdata[,obsintvar], group=as.factor(plotdata[,interval]), colour=as.factor(plotdata[,interval])))+
      xlab('Year at diagnosis') + ylab('Annual Probability of Cancer Death (%)')+
      ggtitle(title.rch) +
      coord_cartesian(ylim=c(0,1))+
      scale_y_continuous(breaks=seq(0,1,0.1),labels = scales::percent)+
      scale_x_continuous(breaks=seq(min(plotdata[,yearvar],na.rm=T),max(plotdata[,yearvar],na.rm=T),5))+
      scale_color_hue(labels = interval.labels)+
      theme(legend.position="bottom")+
      theme(legend.title=element_blank())+
      theme(plot.title = element_text(hjust = 0.5))
  }
  return(plot)
}
