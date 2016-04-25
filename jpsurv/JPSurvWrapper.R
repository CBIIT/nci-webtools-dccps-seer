getJPWrapper<-function(filePath,jpsurvDataString,first_calc)
{
  jpsurvData=fromJSON(jpsurvDataString)
  file=paste(filePath, paste("output-", jpsurvData$tokenId,".rds", sep=""), sep="/")
  outputData=readRDS(file)
  
  jpInd=jpsurvData$additional$headerJoinPoints
  if(first_calc==TRUE)
  {
    jpInd=0
    if(is.na(getSelectedModel(filePath,jpsurvDataString))==FALSE)
    {
      jpInd=getSelectedModel(filePath,jpsurvDataString)-1
    }
    
  }
#  JP_List=outputData$fittedResult$FitList[[jpInd+1]]$apc[1]
# JP=paste(JP_List[[1]],collapse=" ")

   JP_List=outputData$fittedResult$FitList[[jpInd+1]]$jp
   JP=paste(JP_List[[1]],collapse=" ")

  return(JP)
}
