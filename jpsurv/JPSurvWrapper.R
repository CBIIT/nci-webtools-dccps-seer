library('rjson')
library('JPSurv')
library("ggplot2");

VERBOSE=TRUE

getDictionary <- function (inputFile, path, tokenId) {
  fqFileName = file.path(path,inputFile)
  print(fqFileName)
  outputFileName = paste("form-", tokenId, ".json", sep="")
  fqOutputFileName = file.path(path, outputFileName)
  seerFormData = dictionary.overview(fqFileName) 
  cat(toJSON(seerFormData), file = fqOutputFileName)
  return(tokenId)
}
ReadCSVFile <- function (inputFile, path, tokenId, jpsurvDataString,input_type) { 
  print ("HERE!!")
  jpsurvData <<- fromJSON(jpsurvDataString)
  print(jpsurvData)
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
  if(del=="\t"||del==" ")   #If delimter is a space or tab change it to ""
      {
        del=""
      }
  csvdata=read.tabledata(fileName=file.path(path, inputFile),          # fileName: Name of file to use in current directory, or filepath.
                    hasHeader=TRUE,
                    dlm=del);                             # hasHeader: Boolean variable indicating whether or not the CSV being read in has a header row or not. Default is FALSE.
  
  seerFormData=write.tabledic(inputData=csvdata,                       # inputData: Input data.frame.
                    idCols=c(cohorts,year,interval));    
                                                          # idColNum: Integer value defining how many leading columns to create a dictionary of possible values from. Default is 1. 
  print(names(csvdata))
  interval_name=names(csvdata)[interval]
  print(interval_name)

  cohort_name=names(csvdata)[cohorts]
  print(cohorts)

  year_name=names(csvdata)[year]
  print(year_name)


  jsonl =list("data"=seerFormData,"cohort_names"=cohort_name,"cohort_keys"=cohorts,"year"=c(year_name,year),"interval"=c(interval_name,interval),"input_type"=input_type,"statistic"=statistic,"alive_at_start"=alive_at_start,"lost_to_followup"=lost_to_followup,"exp_int"=exp_int,"observed"=observed,"died"=died,"has_headers"=has_headers,"del"=del,"rates"=rates)
  exportJson <- toJSON(jsonl)
  
  print("Creating form file")
  write(exportJson, fqOutputFileName)
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
  print (subsetStr)
  
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
                                variable=gsub("__", "_",variable)
                                return (variable)
                              }

jpsurvData = list()

#Parses the JSON string and sends to getFittedResult to create the SEER Data and the Fitted Results
getFittedResultWrapper <- function (filePath, jpsurvDataString) {
  print ("parsing data string")
  jpsurvData <<- fromJSON(jpsurvDataString)
  print(jpsurvData)
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
  print("DEL")
  print(del)
   length=length(jpsurvData$calculate$form$cohortVars)
  #Creating each possible cohort combination
  combination_array=c()
  #making an array containing each cohort
  for(i in 1:length){
    combination_array[i]=jpsurvData$calculate$form$AllcohortValues[i]
  }
  #creates a matrix of each possible combination
  com_matrix=as.matrix(expand.grid(combination_array))
  
 
  
  jsonl=list()
  #loops through each combnation in t he matrix and creates a R data file
  for(i in 1:nrow(com_matrix)){
    fileName = paste('output', jpsurvData$tokenId,i,sep="-" )
    fileName = paste(fileName, "rds", sep="." )
    
    outputFileName =paste(filePath, fileName, sep="/" )
    print (outputFileName)
    cat('combination',i,com_matrix[i,],"\n")
    # cohortValues=toJSON(com_matrix[i,])
    cohortValues=com_matrix[i,]
    getFittedResult(jpsurvData$session_tokenId,filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange, allVars, cohortVars, cohortValues, numJP,advanced_options, delLastIntvl, outputFileName,jpsurvDataString,projyear,type,del)
    
    print("Fitted Result Time:")
    
    Selected_Model=getSelectedModel(filePath,jpsurvDataString,i)
    print("SELECTED MODEL GET")
    print(Selected_Model)
    jsonl[[i]]=Selected_Model-1
  }
  
  print("Creating chort_models file")
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("cohort_models-", jpsurvData$tokenId, ".json", sep=""), sep="/") #CSV file to download

  write(exportJson, filename)
#Calculates graphs, model estimates etc for first combination by setting first_calc=TRUE
  getAllData(filePath,jpsurvDataString,TRUE)
  print("Calculation time") 
  print("return from getAllData")
  return
  
}
getAllData<- function(filePath,jpsurvDataString,first_calc=FALSE,use_default=TRUE)
{
  
  print("calculating jointpoint")
  jpsurvData <<- fromJSON(jpsurvDataString)
  print("Creating json")
  imageId=jpsurvData$plot$static$imageId
  com=as.integer(jpsurvData$run)
  print("RUN NUMBER:")
  print(com)
  interval=""
  observed=""
  type=jpsurvData$additional$input_type #csv or dictionary
  headers=list()
  print("RUNS")
  del=""
  runs=getRunsString(filePath, jpsurvDataString) #gets runs tring
  #if input type is a CSV file
  if(type=="csv"){
    header=as.logical(jpsurvData$additional$has_header) #contains headers?
    seerFilePrefix = jpsurvData$file$dictionary
    print ("FILE NAME")
    print(seerFilePrefix)
    file_name=paste(jpsurvData$session_tokenId,seerFilePrefix, sep="" )
    file=paste(filePath, file_name, sep="/" )
    del=jpsurvData$additional$del
    if(del=="\t"||del==" ")
      {
        del=""
      }
    seerdata=read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                      hasHeader=TRUE,
                      dlm=del);    
    observed=names(seerdata)[jpsurvData$additional$observed]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    print(observed)
    print(interval)
    input_type="csv"

    died=names(seerdata)[jpsurvData$additional$died]
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    observed=names(seerdata)[jpsurvData$additional$observed]
    

   statistic=jpsurvData$additional$statistic
  if (statistic=="Relative Survival")
  {
    headers=list("Died"=died,"Alive_at_Start"=alive_at_start,"Lost_to_followup"=lost_to_followup,"Expected_Survival_Interval"=exp_int,"Interval"=interval,"Relative_Survival_Cum"=observed)
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
        headers=list("Died"=died,"Alive_at_Start"=alive_at_start,"Lost_to_followup"=lost_to_followup,"Expected_Survival_Interval"=exp_int,"Interval"=interval,"CauseSpecific_Survival_Cum"=observed)
  }



  }
   else 
  {
      observed=jpsurvData$additional$DataTypeVariable
      interval="Interval"
      input_type="dic"
  }

    print("CREATING Year GRAPH")
    YearGraph=getRelativeSurvivalByYearWrapper(filePath,jpsurvDataString,first_calc,com,interval,observed,use_default)

    print("creating IntGraph");
    IntGraph=getRelativeSurvivalByIntWrapper(filePath,jpsurvDataString,first_calc,com,interval,observed,use_default)
    print("Int Graph Time:")
  
  
  ModelSelection=geALLtModelWrapper(filePath,jpsurvDataString,com)
  Coefficients=getcoefficientsWrapper(filePath,jpsurvDataString,first_calc,com)
  print ("header joint point!!")
  print (jpsurvData$additional$headerJoinPoints)
  


  
  JP=getJPWrapper(filePath,jpsurvDataString,first_calc,com)
  print("Completed getting JP")
  
  Selected_Model=getSelectedModel(filePath,jpsurvDataString,com)
  print("Completed getting Selected_Model")
  
  Full_data=getFullDataDownload(filePath,jpsurvDataString,com)
  print("Completed getting Full_data")

   statistic=jpsurvData$additional$statistic
  if (statistic=="Relative Survival")
  {
    statistic="Relative_Survival_Cum"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CauseSpecific_Survival_Cum" 
  }
  

  jpInd=jpsurvData$additional$headerJoinPoints
  print(jpInd)
  SelectedModel=getSelectedModel(filePath,jpsurvDataString,com)
  if(first_calc==TRUE||is.null(jpInd))
  {
    jpInd=SelectedModel-1
    print ("jpInd")
    print(jpInd)
    


  }
  yod=jpsurvData$additional$yearOfDiagnosis
  intervals=jpsurvData$additional$intervals
  if(use_default==TRUE){
    yod=jpsurvData$additional$yearOfDiagnosis_default
    intervals=jpsurvData$additional$intervals_default
  }
  print("YOD!")
  print(use_default)
  print(yod)

  print("statistic")
  print(statistic)
  jsonl =list("IntData"=IntGraph,"YearData"=YearGraph,"Coefficients"=Coefficients,"ModelSelection" = ModelSelection, "JP"=JP,"SelectedModel"=SelectedModel,"Full_Data_Set"=Full_data,"Runs"=runs,"input_type"=input_type,"headers"=headers,"statistic"=statistic,"com"=com,"jpInd"=jpInd,"imageId"=imageId,"yod"=yod,"intervals"=intervals) #returns
  exportJson <- toJSON(jsonl)
  filename = paste(filePath, paste("results-", jpsurvData$tokenId,"-",com,"-",jpInd, ".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)




}
getTrendsData<-function(filePath,jpsurvDataString,com)
{
  jpsurvData <<- fromJSON(jpsurvDataString)
  com=as.integer(jpsurvData$run)
  print ("In trends combination:")
  print(com)
  Trends=getTrendWrapper(filePath,jpsurvDataString,com)
  print("Trends Time:")
  jsonl =c(Trends) #returns
  exportJson <- toJSON(jsonl)
  print("Creating  trends results file")
  filename = paste(filePath, paste("trend_results-", jpsurvData$tokenId,".json", sep=""), sep="/") #CSV file to download
  write(exportJson, filename)
}

#Creates the SEER Data and Fitted Result
getFittedResult <- function (tokenId,filePath, seerFilePrefix, yearOfDiagnosisVarName, yearOfDiagnosisRange, allVars, cohortVars, cohortValues, numJP, advanced_options,delLastIntvlAdv,outputFileName,jpsurvDataString,projyear,type,alive_at_start=NULL,interval=NULL,died=NULL,lost_to_followup=NULL,rel_cum=NULL) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  print ("creating RDS")
  print (numJP)
  print("FILE_NAME IN FITTED RESULTS")
  print(file)
  type=jpsurvData$additional$input_type
  varLabels=getCorrectFormat(allVars)
  
  statistic=jpsurvData$additional$DataTypeVariable
  
  subsetStr=getSubsetStr(yearOfDiagnosisVarName, yearOfDiagnosisRange, cohortVars, cohortValues)
  #assign subsetStr in the global in order for eval(parse(text=)) to work
  assign("subsetStr", subsetStr, envir = .GlobalEnv)
  


  print(type)
  if(type=="dic"){
    file_name=paste(tokenId,seerFilePrefix, sep="" )
    file=paste(filePath, file_name, sep="/" )
    seerdata = joinpoint.seerdata(seerfilename=file,
                                  newvarnames=varLabels,
                                  NoFit=T,
                                  UseVarLabelsInData=varLabels)
    fittedResult=joinpoint(seerdata,
                           subset = eval(parse(text=subsetStr)),
                           year=getCorrectFormat(yearOfDiagnosisVarName),
                           observedrelsurv=statistic,
                           model.form = ~NULL,
                           op=advanced_options,
                           delLastIntvl=delLastIntvlAdv,
                           maxnum.jp=numJP,
                           proj.year.num=projyear);
  }
  if(type=="csv"){
      del=jpsurvData$additional$del
    file_name=paste(tokenId,jpsurvData$file$dictionary, sep="" )
    print(file_name)
    file=paste(filePath, file_name, sep="/" )
    print("here")
    print("DEL")
    if(del=="\t"||del==" ")
      {
        del=""
      }
    print(del)
    seerdata=read.tabledata(fileName=file,          # fileName: Name of file to use in current directory, or filepath.
                    hasHeader=TRUE,
                    dlm=del);      
    alive_at_start=names(seerdata)[jpsurvData$additional$alive_at_start]
    print(alive_at_start)
    
    lost_to_followup=names(seerdata)[jpsurvData$additional$lost_to_followup]
    print(lost_to_followup)
    
    exp_int=names(seerdata)[jpsurvData$additional$exp_int]
    print(exp_int)
    
    observed=names(seerdata)[jpsurvData$additional$observed]
    print(observed)

    interval=names(seerdata)[as.integer(jpsurvData$additional$interval)]
    print(interval)
    
    died=names(seerdata)[jpsurvData$additional$died]
    print(died)
    
    
    fittedResult = joinpoint(seerdata, 
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
  print(outputFileName)
  outputData=list("seerdata"=seerdata, "fittedResult"=fittedResult)
  
  iteration=jpsurvData$plot$static$imageId
  
  print ("saving RDS")
  saveRDS(outputData, outputFileName)
  
  
}
getFullDataDownload <- function(filePath,jpsurvDataString,com) {
  jpsurvData <<- fromJSON(jpsurvDataString)
  iteration=jpsurvData$plot$static$imageId
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  Full_Data=outputData$fittedResult$fullpredicted
  
  cohorts=jpsurvData$calculate$form$cohortVars
  
  for (i in length(cohorts):1)
  {
    value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
    value=noquote(value)
    Full_Data[cohorts[[i]]] <- value
    
    col_idx=ncol(Full_Data)
    Full_Data <- Full_Data[, c(col_idx, (1:ncol(Full_Data))[-col_idx])]
    names(Full_Data)
  }  
  print ("FULL PREDICTED")
  downloadFile = paste(filePath, paste("Full_Predicted-", jpsurvData$tokenId,"-",com,"-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  write.csv(Full_Data, downloadFile, row.names=FALSE)
  return (downloadFile)
  
}

#Graphs the Survival vs year graph and saves a csv file of the data
getRelativeSurvivalByYearWrapper <- function (filePath,jpsurvDataString,first_calc,com,interval_var,observed,use_default=TRUE) {
  
  jpsurvData <<- fromJSON(jpsurvDataString)
  statistic=jpsurvData$additional$statistic
  type=""
  if (statistic=="Relative Survival")
  {
    statistic="R"
    type="Relative"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CS"
    type="Cause-Specific"
  }
  
  jpInd=jpsurvData$additional$headerJoinPoints
  if(first_calc==TRUE||is.null(jpInd))
  {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")  
  outputData=readRDS(file)
  intervals=c()
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  print(yearOfDiagnosisVarName)
  yearOfDiagnosis = jpsurvData$additional$yearOfDiagnosis
  if(use_default==FALSE){
    for(i in 1:length(jpsurvData$additional$intervals)) 
    {
      intervals=c(intervals,jpsurvData$additional$intervals[[i]])
    }
  }
  else{
    yearOfDiagnosis=yearOfDiagnosis=jpsurvData$additional$yearOfDiagnosis_default
    for(i in 1:length(jpsurvData$additional$intervals_default)) 
    {
      intervals=c(intervals,jpsurvData$additional$intervals_default[[i]])
    }

  }
    yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)

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
  graphFile= paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/")
  downloadFile = paste(filePath, paste("data_Year-", jpsurvData$tokenId, "-",com,"-",jpInd,"-",iteration, ".csv", sep=""), sep="/") #CSV file to download
  yearOfDiagnosisVarName=getCorrectFormat(yearOfDiagnosisVarName)
  
  survData=data.plot.surv.year(outputData$fittedResult$FitList[[jpInd+1]],
    int.col=intervals, 
    interval=interval_var)

  maxyear <- max(survData[[yearOfDiagnosisVarName]])

  #JP Trendgraph
  ggplot(survData, aes(x=survData[[yearOfDiagnosisVarName]], group=survData[[interval_var]], colour=factor(survData[[interval_var]]))) + 
    geom_line(aes(y=pred_cum)) + 
    geom_point(aes(y=survData[[observed]])) +
    labs(title="Survival by Year of Diagnosis",
         x="Year of Diagnosis",
         y=paste("Cumulative",type,"Survival", sep=" ")) +
    scale_x_continuous(breaks=seq(0,maxyear,5)) +
    scale_y_continuous(breaks=seq(0,1,0.1)) +
    labs(colour=interval_var)+
    theme(legend.position="bottom", 
            legend.title=element_blank(),
            plot.title = element_text(hjust = 0.5,face = "bold",size=18,vjust=5,margin = unit(c(0, 10, 10, 0), "mm")),
            axis.title=element_text(size=15),
            axis.title.x = element_text(margin = unit(c(10, 0, 0, 0), "mm")),
            axis.title.y = element_text(margin = unit(c(0, 10, 0, 0), "mm")),
            legend.text=element_text(size=9.5))
  
  ggsave(file=paste(filePath, paste("plot_Year-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"))
  results =list("RelSurYearGraph"=graphFile,"RelSurvYearData"=survData) #returns 
  cohorts=jpsurvData$calculate$form$cohortVars
  cols=ncol(survData)
  print("COLS")
  print(cols)
  for (i in length(cohorts):1)
  {
    value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
    print(value)
    value=noquote(value)
    survData[cohorts[[i]]] <- value
    
    col_idx=ncol(survData)
    print(ncol(survData))
      survData <- survData[, c(col_idx, (1:ncol(survData))[-col_idx])]
    names(survData)
  }  

  write.csv(survData, downloadFile, row.names=FALSE)
  return (results)
  
   
}
#Graphs the Survival vs Time graph and saves a
getRelativeSurvivalByIntWrapper <- function (filePath,jpsurvDataString,first_calc,com,interval_var,survar_var,use_default_year=TRUE) {
  print(first_calc)
  jpsurvData <<- fromJSON(jpsurvDataString)
  statistic=jpsurvData$additional$statistic
  type=""
  if (statistic=="Relative Survival")
  {
    statistic="R"
    type="Relative"
  } 
  
  if(statistic=="Cause-Specific Survival")
  {
    statistic="CS"
    type="Cause-Specific"
  }
  
  jpInd=jpsurvData$additional$headerJoinPoints
  print(jpInd)
  if(first_calc==TRUE||is.null(jpInd))
  {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  yearOfDiagnosisVarName = jpsurvData$calculate$static$yearOfDiagnosisVarName
  yearOfDiagnosis = jpsurvData$additional$yearOfDiagnosis
  if(use_default_year==TRUE){
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

  
    maxint <- max(survData[[1]][[interval_var]])
#From package, interval graph
  ggplot(survData[[1]], aes(x=survData[[1]][[interval_var]])) + 
      geom_line(aes(y=pred_cum, colour="pred_cum")) + 
      geom_point(aes(y=survData[[1]][[survar_var]], colour=survar_var)) +
      labs(title=paste("Cumulative",type,"Survival by Interval for", yearOfDiagnosis, sep=" "),
           x=interval_var,
           y=paste("Cumulative",type,"Survival", sep=" ")) +
      scale_x_continuous(breaks=seq(0,maxint,1)) +
      coord_cartesian(ylim=c(0,1)) +
      scale_y_continuous(breaks=seq(0,1,0.1)) +
      scale_colour_discrete(breaks=c("pred_cum", survar_var),
                            labels=c(paste("Predicted Cumulative",type,"Survival", sep=" "), paste("Observed Cumulative",type,"Survival", sep=" "))) +
      theme(legend.position="bottom", 
            legend.title=element_blank(),
            plot.title = element_text(hjust = 0.5,size=20,face = "bold",vjust=5,margin = unit(c(0, 10, 10, 0), "mm")),
            axis.title=element_text(size=18),
            axis.title.x = element_text(margin = unit(c(10, 0, 0, 0), "mm")),
            axis.title.y = element_text(margin = unit(c(0, 10, 0, 0), "mm")),
            legend.text=element_text(size=12.5))
  
  print("end of ggplot")
  ggsave(file=paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"),width = 10, height = 8)
# ggsave(file=paste(filePath, paste("plot_Int-", jpsurvData$tokenId,"-",com,"-",jpInd,"-",iteration,".png", sep=""), sep="/"))
  print("saved int graph")
  results =c("RelSurIntData"=survData,"RelSurIntGraph"=graphFile) #returns 
  cohorts=jpsurvData$calculate$form$cohortVars
  # 
  if(!is.integer(nrow(survData))){
    survData=survData[[1]]
    for (i in length(cohorts):1)
    {
      value=gsub("\"",'',jpsurvData$calculate$form$cohortValues[[i]])
      value=noquote(value)
      survData[cohorts[[i]]] <- value
      
      col_idx=ncol(survData)
      survData <- survData[, c(col_idx, (1:ncol(survData))[-col_idx])]
      names(survData)
    } 
  }
  else{
    survData<-rbind("","","","")
  } 
  print(survData)
  write.csv(survData, downloadFile, row.names=FALSE)  
  return (results)
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
  print(Xvector)
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
  
  file=paste(filePath, fileName, sep="/" )
  trend1=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="RelChgSur"))
  trend2=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="AbsChgSur"))
  trend3=toJSON(aapc(outputData$fittedResult$FitList[[jpInd+1]],type="RelChgHaz"))
  jsonl =c("CS_AAPC"=trend1,"CS_AAAC"=trend2,"HAZ_APC"=trend3)
  
  return(jsonl)
  
}
getJPWrapper<-function(filePath,jpsurvDataString,first_calc,com)
{
  jpsurvData <<- fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  
  jpInd=jpsurvData$additional$headerJoinPoints
  if(first_calc==TRUE||is.null(jpInd))
  {
    jpInd=getSelectedModel(filePath,jpsurvDataString,com)-1
  }
  
  JP_List=outputData$fittedResult$FitList[[jpInd+1]]$jp
  JP=paste(JP_List,collapse=" ")
  
  return(JP)
}

getSelectedModel<-function(filePath,jpsurvDataString,com)
{
  jpsurvData <<- fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,"-",com,".rds", sep=""), sep="/")
  outputData=readRDS(file)  
  model=length(outputData$fittedResult$jp)+1
  print ("SELECTED MODEL")
  print (model)
  return(model)
}


# Creates a string containing each cohort combination, each combination is sperated by a , and each cohort seperated by a +
#ex: ch1 + ch2 + ch3, ch1 + ch2 + ch4
getRunsString<-function(filePath,jpsurvDataString){
  jpsurvData <<- fromJSON(jpsurvDataString)
  length=length(jpsurvData$calculate$form$cohortVars)
  runs=""
  combination_array=c()
  for(i in 1:length){
    combination_array[i]=jpsurvData$calculate$form$AllcohortValues[i]
  }
  com_matrix=as.matrix(expand.grid(combination_array))
  
  for(i in 1:nrow(com_matrix)){
    row=paste(com_matrix[i,],collapse=" + ")
    print(row)
    runs=paste(runs,gsub("\"","",row),sep=" jpcom ")
    print(runs)
  }
  runs=substr(runs, 7, nchar(runs))
  return (runs)
}
