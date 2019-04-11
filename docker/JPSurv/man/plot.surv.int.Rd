\name{plot.surv.int}
\alias{plot.surv.int}
\title{Plots the Survival by Interval}
\description{Generates the Relative or Cause-Specific Survival by Interval graph for selected year and returns corresponding data.}
\usage{plot.surv.int(plotdata,yearvar,year,survType)}
\arguments{
\item{plotdata}{Joinpoint object with predicted values to be plotted.}
\item{yearvar}{Name of the year variable in the dataset.}
\item{year}{Value of the year variable to subset that data to.}
\item{survType}{String containing one of two values: "R" for Relative Survival or "CS" for Cause-Specific Survival. "R" is set to default.}
}
\value{Generates the decribed plot and returns the corresponding dataframe.}
\examples{
# Once the joinpoint function has been run on the data ("breast.example") and the output is stored in
# the joinpoint object "fit1", then we can plot the Relative or Cause-Specific Survival by Interval graph
# and return the corresponding data as follows:
plotINT = plot.surv.int(fit1,
                        yearvar="Year_of_diagnosis_1975",
                        year=1975,
                        interval="Interval",
                        survvar="Relative_Survival_Cum",
                        survType="R"); 
}