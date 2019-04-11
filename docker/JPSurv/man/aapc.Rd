\name{aapc}
\alias{aapc}
\title{Trend summary measures for joint point relative survival model}
\description{Get the trend summary measures for joint point relative survival model.  Measures include annual percentage changes of hazard, annual percentage changes of cumulative relative survival, annual changes of cumulative relative survival.}
\usage{aapc(fit.result, type="AbsChgSur")}
\arguments{
\item{fit}{Joinpoint object with predicted values and joinpoint model selections.}
\item{type}{Type of trend summary measure.  
Supported measures are: 
RelChgHaz - Hazard of cancer death, 
AbsChgSur - Cumulative Relative Survival Average Annual-Absolute Change (in percentage points),
RelChgSur - Cumulative Relative Survival Average Annual Percentage Change.  The default is AbsChgSur.}
}
\value{The estimates, standard errors, and confidence interval of the trend summary measure.}
\examples{
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
# Get the estimate, standard error, and confidence interval of the annual changes of cumulative relative survival.
haz_ac = aapc(fit1, type="AbsChgSur");
}
