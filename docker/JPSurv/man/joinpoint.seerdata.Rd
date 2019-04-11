\name{joinpoint.seerdata}
\alias{joinpoint.seerdata}

\title{Fitting a join point relative survival model}
\description{Read in and format SEER*Stat data in a single step.}
\usage{joinpoint.seerdata(seerfilename,newvarnames=character(0),UseVarLabelsInData=FALSE,...)}
\arguments{
\item{seerfilename}{The file name of the seer files. Here one needs two files: the seer directory file with name extention 'dic' and the seer data file with the same name of the directory file but different name extention, i.e. 'txt'.}
\item{newvarnames}{A list of key words used for referencing the variable in the seer directory file and data file.}
\item{UseVarLabelsInData}{
a logic value or a character variables giving variable names. If true or the variable names, then variable labels read from the dic file will replace associated 
numeric values in the data.frame object, which stores data from the associated data file, for all vars in dic or those (names of which are given by UseVarLabelsInData). 
If false, then data read from the associated data file won't be changed.
}
}
\examples{
# For this example we will be referencig the SEER*Stat session that was used to create the breast.example
# data included with teh package.
# If the "breast.example.txt" is the output data file from SEER*Stat, then joinpoint.seerdata can be used 
# to input the data quickly, while taking into account the relevant information in the accompanying dictionary file.
# Input data is stored in breast.example
breast.data = joinpoint.seerdata(seerfilename="breast.example", 
                                 newvarnames=c("Age_groups","Breast_Stage","Year_of_diagnosis_1975"),
                                 UseVarLabelsInData=FALSE 
);
# The breast.data object can immediately be used as input to teh joinpoint modeling function.
}
