\name{joinpoint}
\alias{joinpoint}
\title{Fitting a join point relative survival model}
\description{Fitting a joinpoint relative survival model}
\usage{joinpoint(data, subset=NULL, na.action = na.fail, 
	year="Year", interval="Interval",
	number.event="Died", number.alive="Alive_at_Start", number.loss="Lost_to_Followup",
	expected.rate="Expected_Survival_Interval", observedrelsurv = NULL,
	model.form = NULL, maxnum.jp = 0,
	op=list(),
	delLastIntvl=F)
}
\arguments{
\item{data}{an optional data frame, list or environment (or object coercible by as.data.frame to a data frame) containing the variables in the model. If not found in data, the variables are taken from environment(formula).}
\item{subset}{an optional vector specifying a subset of observations to be used in the fitting process.}
\item{na.action}{how NAs are treated. The default is first, any na.action attribute of data, second a na.action setting of options, and third na.fail if that is unset. The ¡®factory-fresh¡¯ default is na.omit. Another possible value is NULL. The default is na.fail}
\item{year}{It is about the year or time values and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Year'.}
\item{interval}{It is about the time elapsed from start to the event and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Interval'.}
\item{number.event}{It is the number of events or died and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Died'.}
\item{number.alive}{It is about the number of alive and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Alive_at_Start'.}
\item{number.loss}{It is about the number of Lost_to_Followup and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Lost_to_Followup'.}
\item{expected.rate}{It is about the interval expected survival and could be a vector of numeric or a character string giving a column name of the argument 'data'. The default is the string 'Expected_Survival_Interval'.}
\item{observedrelsurv}{It is about the observed cumulative relative survival and could be a vector of numeric or a character string giving a column name of the argument 'data'. If NULL, then no observed values. The default is NULL.}
\item{model.form}{an object of class "formula": a symbolic description of covariates. Example: ~-1+age+as.factor(stage)}
\item{proj.year.num}{The number of projection years for use in the prediction step. Default value is 10 years, with a valid range of 0 to 30 years.}
\item{maxnum.jp}{The maximum number of join points allowed.  The default is zero, which is equivalent to a proportional hazard relative survival model.}

\item{op}{More options. Details --- \cr

{numbetwn: }{integer value, number of skipped obs between joinpoints exclusive (not count for the joinpoints). Default is 2.} \cr

{numfromstart: }{integer value, number of skipped obs from the first obs to joinpoints exclusive (not count for the joinpoint). Default is 3.} \cr

{numtoend: }{integer value, number of skipped obs from the first obs to joinpoints exclusive (not count for the joinpoint). Default is 4.} \cr

}

\item{delLastIntvl}{an logical value indicating whether or not deleting records of last intervals of all years. The default is false.}
}
\value{
An object of class "joinpoint" will be returned with attributes:
\item{coefficients}{a named vector of coefficients and standard errors}
\item{jp}{the estimates of the join points}
\item{converged}{convergence status}
\item{predicted}{the fitted relative survival rates}
\item{fullpredicted}{the full output matrix, with all year/interval combinations and projections}
\item{xbeta}{the linear predictor}
\item{ll}{log likelihood}
\item{aic}{AIC}
\item{bic}{BIC}
\item{FitList}{a list that contains fitting results for the number of joinpoints = 0,1,...,numJPoints respectively.}
}
\examples{
#Load the provided SEER 18 breast cancer example data.
data(breast.example);
subsetStr="Year_of_diagnosis_1975 >= 1975 & Age_groups == \'00-49\' & Breast_stage == \'Localized\'";
# Fit the survival join point model with zero join points, 
#  i.e., fit the proportional hazard relative survival model.
fit1 = joinpoint(data=breast.example,
                 subset = eval(parse(text=subsetStr)),
                 year="Year_of_diagnosis_1975",
                 observedrelsurv="Relative_Survival_Cum",
                 model.form = NULL,
                 maxnum.jp = 0);
# The fit1 object can now be passed to either plot.surv.year or plot.surv.int, or combined with the
# input data to create an iput/output data table with output.overview.
}
\references{
Yu, B., Huang, L., Tiwari, R. C., Feuer, E. J. and Johnson, K. A. (2009), Modeling population-based cancer survival trends by using join point models for grouped survival data.  Journal of the Royal Statistical Soceity: Series A, 172, 405-425.
}
