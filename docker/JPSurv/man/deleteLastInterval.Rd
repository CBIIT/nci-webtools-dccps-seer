\name{deleteLastInterval}
\alias{deleteLastInterval}
\title{delete records of last intervals of all years}
\description{delete records of last intervals of all years in a data.}
\usage{deleteLastInterval(data,byvarnames,yearcol,intervalcol)}
\arguments{
\item{data}{an data frame, containing byvars, the names of which are given by byvarnames, year column, the name of which is given by yearcol, and interval column, the name of which is given by intervalcol.}
\item{byvarnames}{a vector of characters that gives names of byvars.}
\item{yearcol}{a character variable that gives the name of year variable.}
\item{intervalcol}{a character variable that gives the name of interval variable.}
}
\value{
\item{res}{a data.frame object that contains all from data but records of last intervals of all years for cohorts defined by byvarnames.}
}
\examples{
#define a data set
mydata=data.frame(
  cohort1=c("A","A","A","B","B","B"),
  cohort2=c("C","C","C","D","D","D"),
  year=c(1990,1990,1990,1991,1991,1991),
  interval=c(1,2,3,1,2,4)
);
x=deleteLastInterval(mydata,c("cohort1","cohort2"),"year","interval");
print(x);
}
\references{
}
