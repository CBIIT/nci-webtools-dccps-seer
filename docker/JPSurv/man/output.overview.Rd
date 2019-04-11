\name{output.overview}
\alias{output.overview}
\title{Creates a Combined Input/Output Data Table}
\description{Combines the records from the input dataset with the corresponding model output, if the number of joinpoints exceeds 0
then the models will be indexed in a list.}
\usage{output.overview(inputDF,outputDF,subsetInput)}
\arguments{
\item{inputDF}{Dataframe object containing the input dataset.}
\item{outputDF}{Joinpoint object (treated as dataframe in this case) containing the model output.}
\item{subsetInput}{String used in the process of subsetting the data, used here to subset the input data before merge with output.}
}
\value{An indexed list which contains the merged input and model output.}
\examples{
  # This functions takes both the input data and the joinpoint output as arguments, and combines the two separate 
  # objects while preserving the structure.
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
  # The input data "breast.example" and the model output "fit1" can be combined:
  breast.overview = output.overview(breast.example, fit1, subsetStr);
}