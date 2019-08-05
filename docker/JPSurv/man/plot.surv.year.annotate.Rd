\name{plot.surv.year.annotate}
\alias{plot.surv.year.annotate}
%- Also NEED an '\alias' for EACH other topic documented here.
\title{
Figure - Average Change in Cumulative Survival by Diagnosis Year
}
\description{
A function that returns a plot (or a list including the Absolute Change in Survival trend measures and the plot) for average change in cumulative survival by diagnosis year using ggplot.
The annotation feature is available for nJP<=3 and the number of multiple intervals selected <=3.
}
\usage{
plot.surv.year.annotate(plotdata, fit, nJP, yearvar, obscumvar = "Relative_Survival_Cum", predcumvar = "Predicted_Survival_Cum", interval = "Interval", annotation = 0, trend = 0)
}
%- maybe also 'usage' for other objects documented here.
\arguments{
  \item{plotdata}{
The graph data returned by function download.data with downloadtype="graph".
}
  \item{fit}{
The joinpoint object containing the model output.
}
  \item{nJP}{
The number of joinpoints in the model.
}
  \item{yearvar}{
The variable name for year of diagnosis used in argument 'year' of the function joinpoint.
}
  \item{obscumvar}{
The variable name for observed relative cumulative survival. The default is "Relative_Survival_Cum" for relative survival data. 
For cause-specific data, it needs to be changed accordingly.
}
  \item{predcumvar}{
The variable name for predicted cumulative survival. The default is "Predicted_Survival_Cum".
}
  \item{interval}{
The variable name for year since diagnosis. The default is 'Interval'.
}
  \item{annotation}{
The indicator for the annotation feature. The default is 0 (no annotation on the plot).Two plots with and without annotations will be returned in a list when annotation=1.
}
  \item{trend}{
The indicator for returning the Absolute Change in Survival trend measure tables. The default is 0 (no trend tables returned).
}
}
\value{
  \item{trend=0, annotation=0}{A plot with no annotation for average change in cumulative survival by diagnosis year.}
  \item{trend=0, annotation=1}{A list containing two plots with and without annotations.}
  \item{trend=1, annotation=0}{A list containing a table for the absolute change in survival trend measures and a plot without annotations.}
  \item{trend=1, annotation=1}{A list containing a table for the absolute change in survival trend measures and two plots with and without annotations.}
}
\author{
Fanni Zhang <zhangf@imsweb.com>
}

\seealso{
\code{\link{download.data}}, \code{\link{plot.dying.year.annotate}}, \code{\link{plot.surv.int.multiyears}},\code{\link{aapc.multiints}}.
}
\examples{
data("breast.example")
subsetStr<-"Age_groups=='00-49' & Breast_stage=='Regional'"
yearvar<-"Year_of_diagnosis_1975"
obscumvar<-"Relative_Survival_Cum"
predcumvar<-"Predicted_Survival_Cum"
interval<-"Interval"
fit <- joinpoint(breast.example, subsetStr,
                 year=yearvar, observedrelsurv=obscumvar,
                 model.form = NULL, maxnum.jp = 3, proj.year.num = 5)
nJP<-2
data.graph<-download.data(breast.example,fit,nJP,yearvar,"graph",subsetStr,interval,int.select=c(1,5))
out.anno<-plot.surv.year.annotate(data.graph,fit,nJP,yearvar,obscumvar,predcumvar,interval,annotation=1,trend=1)
out<-plot.surv.year.annotate(data.graph,fit,nJP,yearvar,obscumvar,predcumvar,interval,annotation=0,trend=0)
trend.acs<-out.anno[[1]]
plot.acs.anno<-out.anno[[2]]
plot.acs<-out
}
