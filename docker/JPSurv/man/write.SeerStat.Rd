\name{write.SeerStat}
\alias{write.SeerStat}
%- Also NEED an '\alias' for EACH other topic documented here.
\title{
write data and dictionary information to files
}
\description{
write.SeerStat writes data and dictionary information to files in the format of SEER*STAT export files

}
\usage{
write.SeerStat(myData, DICfileName, TXTfileName = NULL, 
	UseVarLabelsInTxtFile = TRUE, LabVarsNames = NULL,...)
}
%- maybe also 'usage' for other objects documented here.
\arguments{
  \item{myData}{:
%%     ~~Describe \code{myData} here~~
A data.frame object to be output. It may have an attribute 'DICInfo'. If no 'DICInfo' defined, then a default 'DICInfo'
will be created and used for generating the dic file.
}
  \item{DICfileName}{:
filename of the dic file. The default extention is 'dic'. 
If 'DICfileName' does not contain at the end a string '.dic' (letter case does not matter), then '.dic' will be added.
}
  \item{TXTfileName}{:
filename of the associated data file. If TXTfileName = NULL, then a string of 
DICfileName with extention substituted by 'txt' (for uncompressed data file) or 'gz' (for gzip compressed data file)
will be used (whether 'txt' or 'gz' depends on the attribute variable 'DICInfo' of the data.frame object 'myData').
}

  \item{UseVarLabelsInTxtFile}{:
%%     ~~Describe \code{UseVarLabelsInTxtFile} here~~
a logic value. If true, then variable labels will be output into the associated data file. If false, then the numeric 
values will be output. The variables, labels of which are to be output, are  
all character or factor columns of 'myData' if LabVarsNames = NULL, otherwise they are defined by 'LabVarsNames'.

}
  \item{LabVarsNames}{:
%%     ~~Describe \code{LabVarsNames} here~~
a name list of variables in the data.frame 'myData', labels of which will be output into the associated data file, instead of
numeric values.
}

  \item{...}{:
Arguments to be passed to \code{\link{write.table}} for writing to the associated data file.
}

}
\details{
%%  ~~ If necessary, more details than the description above ~~
``write.SeerStat'' writes an object of data.frame to a SEER*Stat data file and 
creates the associated dictionary file that is in the format of SEER*Stat dictionary files. 
The variable names of the SEER*Stat data file are the same as the column names of the data.frame object. 
The contents of sections of dictionary file are based on the attribute variable ``DICInfo" of the data.frame object. 
If users do not define an attribute variable ``DICInfo" of the data.frame object, then default values will be used.
}
\value{
%%  ~Describe the value returned
%%  If it is a LIST, use
%%  \item{comp1 }{Description of 'comp1'}
%%  \item{comp2 }{Description of 'comp2'}
%% ...
The 'DICInfo' actually used for writing to the dictionary file and the associated data file will be returned.
}
\references{
Jun Luo and Binbing Yu, 'SEER2R: An interface between SEER cancer registry data and R'
}
\author{
Jun Luo

Maintainer: Jun Luo <rpackages@gmail.com>

}

%% ~Make other sections like Warning with \section{Warning }{....} ~

\seealso{
%% ~~objects to See Also as \code{\link{help}}, ~~~
\code{\link{read.SeerStat}}, \code{\link{SEER2R}}
}
\examples{

#load testing data: 
data("breast.example");

#create one SEER*STAT export dic and the associated text data file for testing purpose
dicinfoused = write.SeerStat(breast.example, DICfileName = "testrun1.dic", UseVarLabelsInTxtFile=FALSE);


}
% Add one or more standard keywords, see file 'KEYWORDS' in the
% R documentation directory.
\keyword{ SEER*STAT }
\keyword{ Cancer registry }% __ONLY ONE__ keyword per line
\keyword{ SEER2R }
