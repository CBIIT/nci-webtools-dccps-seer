\name{aapc.multiints}
\alias{aapc.multiints}
\title{
Trend summary measures for multiple selected intervals
}
\description{
A function that returns the trend summary measures including Absolute Change in Survival, Relative Change in Survival and Relative Change in Hazard for multiple selected intervals.
}
\usage{
aapc.multiints(fit, type = "AbsChgSur", int.select = NULL)
}
\arguments{
  \item{fit}{
Joinpoint object with predicted values and joinpoint model selections.
}
  \item{type}{
Type of trend summary measure.  
Supported measures are: 
RelChgHaz - Hazard of cancer death, 
AbsChgSur - Cumulative Relative Survival Average Annual-Absolute Change (in percentage points),
RelChgSur - Cumulative Relative Survival Average Annual Percentage Change.  The default is AbsChgSur.
}
  \item{int.select}{
The single or multiple interval values selected for the trend measures calculation. The default is NULL.
}
}
\value{
The estimates, standard errors, and confidence interval of the trend summary measure.
}
\author{
Fanni Zhang <zhangf@imsweb.com>
}
\seealso{
\code{\link{aapc}}
}
\examples{
data("breast.example")
subsetStr<-"Age_groups=='45-65s' & Breast_stage=='Localized'"
fit <- joinpoint(breast.example, subsetStr,
                 year="Year_of_diagnosis_1975", observedrelsurv="Relative_Survival_Cum",
                 model.form = NULL, maxnum.jp = 3, proj.year.num = 5)
trend.rch<-aapc.multiints(fit, type="RelChgHaz",int.select=c(1,3,5)) 
}

