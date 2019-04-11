\name{plot.surv.year}
\alias{plot.surv.year}
\title{Plots the Trend Graph}
\description{Generates the Trend graph and returns corresponding data for both selected/non-selected models.}
\usage{plot.surv.year(fit.result,int.col,covar.cont.col,covar.col,survType,stringtitle)}
\arguments{
\item{fit.result}{Joinpoint object with predicted values and joinpoint model selections.}
\item{int.col}{Selected Interval values in c() object.}
\item{covar.cont.col}{Continuity status of selected covariates in c() object (Default is NA).}
\item{covar.col}{Selected covariate values in c() object.}
\item{interval}{String containing the name of the column with Interval data.}
\item{survvar}{String containing the name of the column with the input survival data.}
\item{survType}{String containing one of two values: "R" for Relative Survival or "CS" for Cause-Specific Survival. "R" is set to default.}
\item{titlestring}{String containing the desired plot title.}
}
\value{Generates the decribed plot and returns the corresponding dataframe.}
\examples{
# Once the joinpoint function has been run on the data ("breast.example") and the output is stored in
# the joinpoint object "fit1", then we can plot the joinpoint trend graph and return the corresponding 
# data as follows:
plotYEAR = plot.surv.year(breast.example.result,
                          int.col=c(1,3,5),
                          covar.cont.col=c(NA),
                          covar.col=c(NA),
                          yearvar="Year_of_diagnosis_1975",
                          interval="Interval",
                          survvar="Relative_Survival_Cum",
                          survType="R",
                          titlestring="CUSTOM TITLE");
} 