
# Combination of data input and model execution.  
joinpoint.seerdata = function(seerfilename, newvarnames=character(0),UseVarLabelsInData=FALSE,...) {

  #read data from seer files
  seerdata = .read.SeerStat(seerfilename,UseVarLabelsInData=UseVarLabelsInData);
  
  SessionAttr = attr(seerdata,"DICInfo");
  SessionType = SessionAttr$SessionOptionInfo[3,2]; #Either "Relative Survival" or "Cause-Specific Survival"
  if(SessionType == "Cause-Specific Survival"){
    Expected_Survival_Interval = rep(1,length(seerdata$CauseSpecific_Survival_Cum)); 
    seerdata = cbind(seerdata,Expected_Survival_Interval);
  }
  
  varnames=c(newvarnames);
  varnames=factor(varnames);
  varnames=levels(varnames);
  #tempdata = attr(seerdata,"assignColNames")(seerdata,varnames);
    
    #colnames(seerdata) = colnames(tempdata);
  
    return(seerdata);

}

# Function to return the information from the .dic file for parsing purposes.
# Added 12/12/2014 - DM
dictionary.overview = function(DICfilename) {
  
  DICdata = .read.SeerStatDIC(DICfilename);
  
  DICoverview = list(
    SystemInfo = DICdata$SystemInfo,
    SessionOptionInfo = DICdata$SessionOptionInfo,
    ExportOptionInfo = DICdata$ExportOptionInfo,
    VarAllInfo = DICdata$VarAllInfo,
    VarFormatSecList = DICdata$VarFormatSecList,
    VarLabelInfo=DICdata$VarLabelInfo,
    VarWithoutFormatItem = DICdata$VarWithoutFormatItem
    );
  
  return(DICoverview);
  
}

# Function to return the value of the Life Page variable in the loaded dictionary file.
# Added 1/23/2015 - DM
find.life.page.val = function(pagetypeDF) {
  
  row_num <- nrow(pagetypeDF);
  for (i in 1:row_num ) {
    if(pagetypeDF[i,2] == "Life Page"){
      lpvalueSTR <- pagetypeDF[i,1];
    };
  };
  
  lpvalue <- as.numeric(lpvalueSTR);
  
  return(lpvalue);
  
}

# Function to return the output table combined with the input table.
# Added 3/16/2015 - DM
output.overview = function(inputDF,outputDF,subsetInput) {
  
  #start by subsetting the input data as used in the model.
  inputM <- subset(inputDF,eval(parse(text=subsetInput)));
  
  #Also get rid of all records with missing data.
  inputM = subset(inputM,Relative_Survival_Interval != "NA")
  
  #Next grab the input data using the user defined variable names.
  inputattr <- attributes(inputDF);
  usernames <- inputattr$DICInfo$UseVarLabelsInData;
  numnames <- length(usernames);
  yearstr <- usernames[numnames];
  
  #Calculate the number of joinpoint models run.
  numJP = length(outputDF$FitList);
  
  overview = list();
  for (i in 1:numJP) {
    #Shorten the path for the output data.
    outputM <- outputDF$FitList[i];
    outputMsimple <- outputM[[1]]$predicted
    outputMfinal <- outputMsimple[order(outputMsimple[,1], outputMsimple[,2]), ]
    
    overview[[length(overview)+1]] <- list(
      Calendar_Year = inputM[[yearstr]],
      Years_since_Diagnosis = inputM$Interval,
      Alive_at_Start = inputM$Alive_at_Start, 
      Died = inputM$Died,
      Lost_to_Followup = inputM$Lost_to_Followup,
      Observed_Interval = inputM$Observed_Survival_Interval,
      Observed_Cumulative = inputM$Observed_Survival_Cum,
      Expected_Interval = inputM$Expected_Survival_Interval,
      Expected_Cumulative = inputM$Expected_Survival_Cum,
      Relative_Interval = inputM$Relative_Survival_Interval,
      Relative_Cumulative = inputM$Relative_Survival_Cum,
      Observed_SE_Interval = inputM$Observed_SE_Interval,
      Observed_SE_Cumulative = inputM$Observed_SE_Cum,
      Relative_SE_Interval = inputM$Relative_SE_Interval,
      Relative_SE_Cumulative = inputM$Relative_SE_Cum,
      Predicted_Relative_Interval = outputMfinal$pred_int,
      Predicted_Relative_Cumulative = outputMfinal$pred_cum,
      Predicted_SE_Relative_Interval = outputMfinal$pred_int_se,
      Predicted_SE_Relative_Cumulative = outputMfinal$pred_cum_se
    )
  }
  
  return(overview);
  
}

#Function to return the relative survival by interval graph.
# Added 6/1/2015 - DM
# Updated 11/23/2015 - DM
plot.surv.int = function(plotdata, yearvar=NULL, year=NULL, interval=NULL, survvar=NULL, survType="R") {

  plotdf <- as.data.frame(plotdata$predicted, stringsAsFactors=FALSE);
  
  #Used to determine the column number of the year variable, which shows if covariates exist or not.
  yearcolnum = match(yearvar,names(plotdf));

  #Calculate the max interval.
  intcol <- plotdf[,interval];
  maxintnum = max(range(intcol));
  maxyear = max(range(plotdf[,yearvar]));
  
  plotdf[,yearvar] <- as.numeric(plotdf[,yearvar]);
  if(is.null(year)) year = min(plotdf[,yearvar]); #If year is not specified, set equal to first availabe year in predicted data. 
  plotdfy = plotdf[plotdf[,yearvar] == year,];
  
  if(year < min(plotdf[,yearvar])){ #Verify that year value passed to function is not less than minimum in predicted data.
    plot(NULL,NULL,xlim=c(0,maxintnum), ylim=c(0,1), xlab="Interval", xaxt="n", ylab="");
    axis(1,at = seq(0, maxintnum, by = 1), las=2);
    text(x=(maxintnum/2),y=0.5,"Invalid year selection: No available data.");
    if(survType=="R"){
      title(paste("Cumulative Relative Survival by Interval for", year, sep=" "));
      plotdffin <- plotdfy[c(yearvar,interval,survvar,"pred_cum")];
    }
    if(survType=="CS"){
      title(paste("Cumulative Cause-Specific Survival by Interval for", year, sep=" "));
      plotdffin <- plotdfy[c(yearvar,interval,survvar,"pred_cum")];
    }
    
    return(plotdffin); #For this case, the dataset will be empty.
  }

  
  zerorow <- NULL;
  if(yearcolnum>1){
    if(survType=="R"){
      plotdffin <- split(plotdfy[c(yearvar,interval,survvar,"pred_cum")], f=plotdfy[1:2]);
    }
    if(survType=="CS"){
      plotdffin <- split(plotdfy[c(yearvar,interval,survvar,"pred_cum")], f=plotdfy[1:2]);
    }
    for(Index in 1:yearcolnum){
      zerorow <- c(year,0,1.0,1.0);
      plotdffin[[Index]] <- rbind(plotdffin[[Index]],zerorow);
      plotdftemp <- plotdffin[[Index]];
      plotdftemp <- plotdftemp[order(plotdftemp[,interval]), ];
      plotdffin[[Index]] <- plotdftemp;
    } 
  }else{
    if(survType=="R"){
      plotdfmin <- plotdfy[c(yearvar,interval,survvar,"pred_cum")];
    }
    if(survType=="CS"){
      plotdfmin <- plotdfy[c(yearvar,interval,survvar,"pred_cum")];
    }
    plotdfmin <- plotdfmin[order(plotdfmin[,interval]), ]
    plotdffin <- list(plotdfmin);
    
    zerorow <- c(year,0,1.0,1.0);
    plotdffin[[1]] <- rbind(zerorow,plotdffin[[1]]);
  }
  

    
    #Ranges for the graph and other formatting:
    #xrange <- range(0:maxintnum);
    #yrange <- range(0:1);
    colortype <- c("blue","red","black","green","orange","yellow");
    if(survType=="R"){
      legList <- c("Observed Cumulative Relative Survival", "Predicted Cumulative Relative Survival");
      ylabel <- "Cumulative Relative Survival";
    }
    if(survType=="CS"){
      legList <- c("Observed Cumulative Cause-Specific Survival", "Predicted Cumulative Cause-Specific Survival");
      ylabel <- "Cumulative Cause-Specific Survival";
    }
    
    plot(NULL,NULL,xlim=c(0,maxintnum), ylim=c(0,1), xlab="Interval", xaxt="n", ylab=ylabel);
    axis(1,at = seq(0, maxintnum, by = 1), las=2)
    for(Index in 1:yearcolnum){
      if(survType=="R"){
        lines(plotdffin[[Index]][,interval], plotdffin[[Index]][,survvar], lwd=2, type="p", pch=20, col=colortype[Index]);
      }
      if(survType=="CS"){
        lines(plotdffin[[Index]][,interval], plotdffin[[Index]][,survvar], lwd=2, type="p", pch=20, col=colortype[Index]);
      }
      lines(plotdffin[[Index]][,interval], plotdffin[[Index]]$pred_cum, lwd=2, type="l", lty=1, col=colortype[Index]);
    }
    if(survType=="R"){
      title(paste("Cumulative Relative Survival by Interval for", year, sep=" "));
    }
    if(survType=="CS"){
      title(paste("Cumulative Cause-Specific Survival by Interval for", year, sep=" "));
    }
    #legend("bottomleft", inset=0.05, legend=legList, fill=colortype);
    
  
  return(plotdffin);
}

#Generalized plot.surv function which can plot both selected/unselected models.
# Added 1/11/2016
plot.surv.general = function(dataF,Intervals=c(1,3,5),covar.continuous=list(),covar.cat=list(),
                             yearvarI=NULL,intervalI=NULL,survvarI=NULL,survType="R",titlestring=NULL) {
  
  .get.color=function(color.index){
    colorlist = c("darkgreen", "blue", "darkorange", "purple","black","red");
    crntindex = length(colorlist) - ((length(colorlist)- color.index) %% length(colorlist));
    return(colorlist[crntindex]);
  }
  YearShift = 0;
  covar.names=dataF$covar.names;
  Z=dataF$Z;
  cols.Z=colnames(Z);
  Num.cols.Z=length(cols.Z);
  covar.types=.is.substring.vector("factor(",covar.names,ignore.case=F,fixed=T);
  covar.names.continuous=covar.names[!covar.types];
  covar.names.cat=covar.names[covar.types];
  
  covar.datacol.continuous=match(covar.names.continuous,cols.Z,0);
  
  createplot=TRUE;
  caseindex=0;
  legendcolors=c();
  legendlabels=c();
  linetypes=c();
  # Get the predicted values
  Z0 = dataF$Z0
  ZVlist=list();
  obsindexlist=list();
  if(length(covar.continuous)>0 && length(covar.cat)>0 && Num.cols.Z>0){
    for(ZIndex in 1:length(covar.cat)){
      ZValue=Z0[1,,drop=F];
      ZValue[1,]=0;
      ZValue[1,(covar.datacol.continuous)]=covar.continuous[[ZIndex]];
      if(length(covar.cat[[ZIndex]])>0)
        for(Index.cat in 1:length(covar.cat[[ZIndex]])){
          VarLabel=paste(covar.names.cat[Index.cat],as.character(covar.cat[[ZIndex]][Index.cat]),sep="");
          VarLabel.cols=.search.substr(VarLabel,cols.Z,fixed=T);
          if(!is.null(VarLabel.cols) && (length(VarLabel.cols)>0)){
            if(length(VarLabel.cols)>1) stop("length(VarLabel.cols)>1, Z has multicolilearity problem!");
            ZValue[1,VarLabel.cols]=1;
          }else{
          }
        }
      ZVlist[[ZIndex]]=ZValue;
    }
  }else{
    ZVlist=list(Z0);
  }
  if(length(ZVlist)>0){
    maintitle="";
    havingZ = (!is.null(Z));
    for(ZIndex in 1:length(ZVlist)){
      pred = dataF$Predict(Z0=ZVlist[[ZIndex]]);
      ZLabel="";
      if(havingZ) ZLabel=paste("Z",ZIndex,": ",sep="");
      obsindex=NULL;
      if(!is.null(Z))
        obsindex=rep(T,dim(Z)[1]);
      
      if(length(covar.names.cat)>0)
        for(Index.cat in 1:length(covar.names.cat)){
          cols.var=.search.substr(covar.names.cat[Index.cat],cols.Z,fixed=T);
          if(length(cols.var)>0){
            for(index.cols.var in 1:length(cols.var)){
              obsindex=obsindex & (Z[,cols.var[index.cols.var]]==ZVlist[[ZIndex]][1,cols.var[index.cols.var]]); 
            }
          }else{
          }
        }
      obsindexlist[[ZIndex]]=obsindex;
      
      .get.Zinfo=function(ZValue){
        res=character(length(covar.names));
        if(length(covar.names)>0)
          for(Index.covar.names in 1:length(covar.names)){
            in.cat = match(covar.names[Index.covar.names],covar.names.cat,0);
            cols.var=.search.substr(covar.names[Index.covar.names],cols.Z,fixed=T);
            if(in.cat>0){
              if(length(cols.var)>0){
                is.reference=T;
                for(index.cols.var in 1:length(cols.var)){
                  if(ZValue[1,cols.var[index.cols.var]]==1){
                    res[Index.covar.names]=paste(covar.names[Index.covar.names],"=",
                                                 sub(covar.names[Index.covar.names],"",colnames(ZValue)[cols.var[index.cols.var]],fixed=T),sep="");
                    is.reference=F;
                    break;
                  }                  
                }
                if(is.reference){
                  res[Index.covar.names]=paste(covar.names[Index.covar.names],"=",
                                               dataF$referencelevel[Index.covar.names],sep="");
                }
              }
            }else{
              if(!is.null(cols.var) && (length(cols.var)>0)){
                if(length(cols.var)>1) stop("length(cols.var)>1, Z has multicolilearity problem!");
                res[Index.covar.names]=paste(covar.names[Index.covar.names],"=",ZValue[1,cols.var],sep="");
              }
            }
          }
        return(res);
      }

      
        # Plot the predicted values of the 1-, 3-, 5-year survival
        legendlabels.crnt=c(); 
        legendcolors.crnt=c();
        linetypes.crnt=c();
        for(IndexInterval in Intervals){ #Loops through the selected intervals.
          caseindex=caseindex+1;
          casecolor=.get.color(caseindex);
          pred1 = base::subset(pred, Interval == IndexInterval); #Subset to current interval
          if(survType=="R"){
            ylabel <- "Cumulative Relative Survival";
          }
          if(survType=="CS"){
            ylabel <- "Cumulative Cause-Specific Survival";
          }
          if(createplot){ 
            plot(pred1$Year + YearShift, pred1$pred_cum, type = "l", lwd = 3, col = casecolor, 
                 xlab = "Year of diagnosis", ylab = ylabel, ylim = c(0, 1)
            );
          createplot=FALSE;
        }else{
          lines(pred1$Year + YearShift, pred1$pred_cum, type = "l", lwd = 3, col = casecolor);
        }
        pred2 = base::subset(pred1, Year %in% (dataF$jp)); #Finds the joinpoint years
        lines(pred2$Year + YearShift, pred2$pred_cum, type = "p", pch = 20, cex = 1.8, col = casecolor);
        
        legendcolors.crnt=c(legendcolors.crnt, casecolor);
        legendlabels.crnt=c(legendlabels.crnt, paste(IndexInterval,"-yr est.",sep=""));
        if(ncol(dataF$predicted)>=11){
          if((length(obsindexlist)>=ZIndex) && !is.null(obsindexlist[[ZIndex]])){
            data.crnt=dataF$predicted[obsindexlist[[ZIndex]],,drop=F];
          }else{
            data.crnt=dataF$predicted;
          }
          #lifeDat2 = base::subset(data.crnt, Interval == IndexInterval);
          lifeDat2 =data.crnt[data.crnt[,2] == IndexInterval,,drop=F];
          lines(lifeDat2[, 1] + YearShift, lifeDat2[, 7], type = "p", pch = 20, cex = 1.25, col = casecolor);
        }
      }
      # Plot the observed values of the 1-, 3-, 5-year survival
      if(ncol(dataF$predicted)>=11){
        legendlabels.crnt=c(legendlabels.crnt, sub("est","obs", legendlabels.crnt));
        legendcolors.crnt=c(legendcolors.crnt,legendcolors.crnt);
        linetypes.crnt=c(rep(1,length(legendlabels.crnt)/2), rep(3,length(legendlabels.crnt)/2));
      }else{
        linetypes.crnt=c(rep(1,length(legendlabels.crnt)));
      }
      if(havingZ)
        legendlabels.crnt=paste(legendlabels.crnt, ", Z", ZIndex, sep="");
      
      #varvalueinfo=.get.Zinfo(ZVlist[[ZIndex]]);
      #maintitle=paste(
        #maintitle,
        #paste0(ZLabel,paste0(varvalueinfo,collapse=", ")),
        #"\n",
        #sep="");
      if(is.null(titlestring)){ maintitle = "Default Title";}
      else{ maintitle = titlestring;}
      
        legendlabels=c(legendlabels,legendlabels.crnt); 
        legendcolors=c(legendcolors,legendcolors.crnt);
        linetypes=c(linetypes,linetypes.crnt);
    
        legend("bottomright", legendlabels, 
             lty = linetypes, lwd = 3, col = legendcolors);
             title(main=maintitle);
      
    }
  }
  invisible();
}

#Wrapper function to return the data set along with the standard joinpoint plot.
# Added 8/3/2015  
plot.surv.year = function(fit.result, int.col, covar.cont.col, covar.col, yearvar=NULL, 
                          interval=NULL, survvar=NULL, survType="R", titlestring = NULL) {
  
  plotdf <- as.data.frame(fit.result$predicted, stringsAsFactors=FALSE);
  
  plotdfmin = plotdf[plotdf[,interval] %in% int.col, ];
 
  plot.surv.general(fit.result,Intervals=int.col,covar.continuous=covar.cont.col,covar.cat=covar.col,
                    yearvarI=yearvar,intervalI=interval,survvarI=survvar,survType,titlestring);
  
  return(plotdfmin); 
  
}

#Function that reads in input data files in CSV format.
#Added 8/31/2016
read.tabledata = function(fileName, hasHeader=FALSE, dlm=NULL) {
  
  inputFile = read.table(fileName, header=hasHeader, dec=".", sep=dlm, na.strings="NA",check.names=FALSE); 
  return(inputFile);
  
}

#Function that returns a simple dictionary of values from a CSV.
#Added 9/7/2016
write.tabledic = function(inputData, idCols=c()) {

  csvDic = list();
  idColNum = length(idCols);
  for(Index in 1:idColNum){
    csvDic[[Index]] = unique(inputData[,idCols[Index]]);
    names(csvDic)[Index] = idCols[Index];
  }

  return(csvDic);
  
}

#Function that returns the accompanying data for plot.surv.int.
#Added 12/12/2016
data.plot.surv.int = function(fit.result, yearvar=NULL, year=NULL, interval=NULL, survvar=NULL) {

  plotdf <- as.data.frame(fit.result$predicted, stringsAsFactors=FALSE);
  
  plotdf[,yearvar] <- as.numeric(plotdf[,yearvar]);
  if(is.null(year)) year = min(plotdf[,yearvar]);
  plotdfy = plotdf[plotdf[,yearvar] == year,];
  
  plotdfmin <- plotdfy[c(yearvar,interval,survvar,"pred_cum")];
  
  plotdfmin <- plotdfmin[order(plotdfmin[,interval]), ]
  plotdffin <- list(plotdfmin);
  
  zerorow <- c(year,0,1.0,1.0);
  plotdffin[[1]] <- rbind(zerorow,plotdffin[[1]]);
  
  return(plotdffin);
  
}

#Function that returns the accompanying data for plot.surv.year.
#Added 12/12/2016
data.plot.surv.year = function(fit.result, int.col=c(), interval=NULL) {
  
  plotdf <- as.data.frame(fit.result$predicted, stringsAsFactors=FALSE);
  
  plotdfmin = plotdf[plotdf[,interval] %in% int.col, ];

  return(plotdfmin);
  
}


