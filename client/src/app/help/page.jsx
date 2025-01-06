"use client";
import Container from "react-bootstrap/Container";
import VideoPlayer from "@/components/video-player";

export default function Help() {
  return (
    <Container className="py-3">
      <article className="shadow p-4 rounded">
        <div className="py-3">
          <h2 className="text-primary">Background</h2>
          <p>
            JPSurv software was developed to analyze trends in survival with respect to the year of diagnosis [1].
            Survival data includes two time scales that must be taken into consideration: the calendar year of diagnosis
            and the time since diagnosis. The JPSurv model is an extension of the Cox proportional hazards model and of
            Hakulinen and Tenkanen [2] for relative survival. JPSurv fits a proportional hazard joinpoint model to
            survival data on the log hazard scale. Jointpoint models consist of linear segments connected through
            &ldquo;joinpoints,&rdquo; which represent the times at which trends changed. The hazard of cancer death is
            specified as the product of a baseline hazard, on the time since diagnosis scale, and a multiplicative
            factor describing the effect of year of diagnosis and other covariates. The year of diagnosis effect is
            modeled as joined linear segments on the log scale. The number and location of joinpoints are estimated from
            data. The model implies that the probability (hazard) of cancer death as a function of time since diagnosis
            is proportional for subjects diagnosed in different calendar years. The JPSurv software uses discrete-time
            survival data, i.e., data grouped by years since diagnosis in the life table format. The software can
            accommodate both relative survival and cause-specific survival.
          </p>
          <p>
            The purpose of this tutorial is to provide a step-by-step illustration on how to utilize JPSurv to analyze
            changes in survival trends.
          </p>
          <br />
          <h2 className="text-primary">Objective</h2>
          <p>
            The goal is to estimate relative survival trends from 1975 for patients (any sex, any stage) diagnosed with
            Non-Hodgkin Lymphoma (NHL) or Chronic Myeloid Leukemias (CML). Note that we usually don’t select the last
            diagnosis year (2018 in our case) because the last year may miss some of the deaths and survival may be
            overestimated.
          </p>
          <br />
          <h2 className="text-primary">
            Step 1: Extract the data from SEER<sup>*</sup>Stat
          </h2>
          <p>
            JPSurv can read in grouped relative or cause-specific survival data generated from SEER*Stat. The minimum
            variables required are: calendar year of diagnosis, survival time interval (i.e., years from diagnosis),
            number at risk at beginning of interval, number of deaths, number of cases lost to follow-up, and, in the
            case of relative survival, interval expected survival. Data may also include other covariates of interest,
            such as cancer site, sex, stage, etc.
          </p>
          <br />
          <h5 className="text-primary">
            <i>Opening the survival session, selecting the database, and selecting the cases</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-1.mp4" type="video/mp4" />
          <ol>
            <li>Open the survival session</li>
            <li>
              <b>Select database:</b> Select the SEER*Stat database (SEER Research Data, 9 registries (1975-2018) Nov
              2020 submission)
            </li>
            <li>
              <b>Select Relative survival:</b> Go to the STATISTICS tab and select &ldquo;Relative survival&rdquo;
            </li>
            <li>
              <b>Selection of years of diagnosis 1975-2017 and cancer sites.</b> Go to the SELECTION tab. In the CASE
              SELECTION box click EDIT. In the VARIABLE box go to:
              <ol type="a">
                <li>
                  &ldquo;Race, Sex, Year Dx&rdquo; folder. Click Year of diagnosis and select years 1975 through 2017
                </li>
                <li>
                  &ldquo;Site and Morphology&rdquo; folder. Click Site Recode ICD-O-3/WHO 2008. Select Non-Hodgkin
                  Lymphoma and Chronic Myeloid Leukemias
                </li>
              </ol>
            </li>
          </ol>
          <br />
          <h5 className="text-primary">
            <i>Defining the intervals for calculations</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-2.mp4" type="video/mp4" />
          <ol start="5">
            <li>
              <b>Define 10 annual (or 12 month) intervals for calculation of relative survival and the output format</b>
              <ol type="a">
                <li>
                  In the INTERVAL box in PARAMETERS tab, for &ldquo;Month Per&rdquo; select or type 12. For
                  &ldquo;Number&rdquo; select 10.
                </li>
                <li>
                  In the DISPLAY Box check <b>Standard Life.</b>
                </li>
              </ol>
            </li>
          </ol>
          <br />
          <h5 className="text-primary">
            <i>Defining the intervals for calculations using the CANSURV/JPSurv Output format</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-3.mp4" type="video/mp4" />
          <ul>
            <li style={{ listStyleType: "none" }}>
              <ol type="a" start="3">
                <li>
                  Alternatively, for step 5 you can select Session in the main menu and select CANSURV/JPSurv output.
                  This selection will automatically set the interval to 12 months. You still need to define 10 intervals
                  (instead of the default of 5).
                </li>
              </ol>
            </li>
          </ul>
          <br />
          <h5 className="text-primary">
            <i>Creating the year of diagnosis and cancer site variables for stratification</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-4.mp4" type="video/mp4" />
          <ol start="6">
            <li>
              <b>Include the variables that will be used to stratify survival calculations.</b>
              Go to the TABLE tab.
              <ol type="a">
                <li>
                  <b>Create a new variable that will include single year of diagnosis from 1975 through 2017.</b>
                  Click on the &ldquo;Race, Sex, Year Dx&rdquo; folder. Click Year of diagnosis and then the CREATE
                  button. Delete 1975-2018 and 2018 values and save it with a new name. Add this as a page, row, or
                  column (it does not matter which)
                </li>
                <li>
                  <b>Create a new variable that will include only 2 sites NHL and CML.</b>
                  Using the same process, click on the &ldquo;Site and Morphology&rdquo; folder. Click Site Recode
                  ICD-O-3/WHO 2008 and then the CREATE button. Delete all values, select NHL and CML. Save it with a new
                  name. Add this as a page, row, or column (it does not matter which)
                </li>
              </ol>
            </li>
            <li>
              <b>Run SEER*Stat</b>
            </li>
          </ol>
          <br />
          <h5 className="text-primary">
            <i>Saving and Exporting</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-5.mp4" type="video/mp4" />
          <ol start="8">
            <li>
              <b>
                Save the results and export the matrix. Go to the Matrix in the main menu. Matrix -{">"} Export -{">"}{" "}
                Results as Text File
              </b>
            </li>
          </ol>
          <br />
          <h2 className="text-primary">
            Step 2: Reading the data into JPSurv, specifying parameters, and running JPSurv
          </h2>
          <h5 className="text-primary">
            <i>Importing data using Dic/Data files</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-6.mp4" type="video/mp4" />
          <p>
            Data sets generated in SEER*Stat must include year at diagnosis as a covariate. To reflect trends in
            calendar years, 12 months per interval needs to be specified. In addition, the &ldquo;Display/Standard
            Life&rdquo; option in the Parameters tab must be checked as JPSurv does not read the &ldquo;Summary
            Table&rdquo; format. Data can be exported directly from SEER*Stat and saved as a .txt file with a
            corresponding dictionary .dic file.
          </p>
          <ol>
            <li>
              Open JPSurv by searching for &ldquo;JPSurv&rdquo; and &ldquo;NCI&rdquo; keywords or entering the URL
              <a href="https://analysistools.cancer.gov/jpsurv/">https://analysistools.cancer.gov/jpsurv/</a>
            </li>
            <li>Confirm that Dic/Data Files is selected in the File Format section.</li>
            <li>
              Click the Choose Files button and select the .txt and .dic files exported in Step 1. Note that you need to
              select both at the same time.
            </li>
            <li>Press Upload Input Files button</li>
          </ol>
          <br />
          <h5 className="text-primary">
            <i>Importing data using CSV files</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-7.mp4" type="video/mp4" />
          <p>
            JPSurv can also read data from delimited text files with common delimiters (comma, semicolon, or tab). Users
            will need to have some prior knowledge of the data stored in each column to correctly use JPSurv. The data
            requires at minimum: calendar year of diagnosis, survival time interval, number at risk at beginning of
            interval, number of deaths, number of cases lost to follow-up, and, in the case of relative survival,
            interval expected survival. Data may also include other covariates of interest, such as cancer site, sex,
            stage, etc. Note that the survival time interval should be at equal intervals and should not have any gaps.
            Note that when using a delimited text file as input to JPSurv, the user must convert the interval expected
            survival column to Proportions from Percentages as the acceptable range of inputs is [0,1].
          </p>
          <ol>
            <li>
              Open JPSurv by searching for &ldquo;JPSurv&rdquo; and &ldquo;NCI&rdquo; keywords or entering the URL
              <a href="https://analysistools.cancer.gov/jpsurv/">https://analysistools.cancer.gov/jpsurv/</a>
            </li>
            <li>Confirm that CSV Files is selected in the File Format section.</li>
            <li>Click the Browse button and select the .csv or .txt file exported in Step 1.</li>
            <li>Once the file is selected a new window will pop up for CSV Configuration</li>
            <li>Choose the appropriate delimiter</li>
            <li>
              If the file contains headers, make sure the box titled &ldquo;Does the file contain headers?&rdquo; is
              checked. Otherwise, uncheck the box.
            </li>
            <li>Choose the appropriate data type, either Relative Survival or Cause-Specific Survival.</li>
            <li>Choose the appropriate display option for rates, either Percents or Proportions.</li>
            <li>You can change the desired number of rows to display</li>
            <li>
              Choose the drop-down menu for each column and select the parameter corresponding to each column. Note that
              all required parameters must be mapped to the appropriate column.
            </li>
            <li>Press Save.</li>
            <li>Press Upload.</li>
          </ol>
          <br />
          <h5 className="text-primary">
            <i>Importing data using JPSurv workspace</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-8.mp4" type="video/mp4" />
          <ol>
            <li>
              Open JPSurv by searching for &ldquo;JPSurv&rdquo; and &ldquo;NCI&rdquo; keywords or entering the URL
              <a href="https://analysistools.cancer.gov/jpsurv/">https://analysistools.cancer.gov/jpsurv/</a>
            </li>
            <li>Confirm that Workspace is selected in the File Format section.</li>
            <li>Click the Browse button and select the .jpsurv workspace file.</li>
            <li>Press Import and the JPSurv session will load automatically. &nbsp;</li>
          </ol>
          <br />
          <h2 className="text-primary">Fit a model with 1 Joinpoint to NHL data</h2>
          <h5 className="text-primary">
            <i>Fitting a simple joinpoint survival model to NHL data</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-9.mp4" type="video/mp4" />
          <ol>
            <li id="isPasted">Import NHL data using the appropriate option (Dic/Dat, CSV, or Workspace)</li>
            <li>
              In the Year of Diagnosis Range box, specify the number of years that will be used to fit the JPSurv model.
              In this example, all years of diagnosis will be used.
            </li>
            <li>
              In the Max No. of Year from Diagnosis (follow-up) to include box, the user can specify the maximum
              intervals from diagnosis to select a subset of the input data to be used in analysis. In this example, the
              maximum length of follow-up allowed will be used.
            </li>
            <li>Select &ldquo;Non-Hodgkin Lymphoma&rdquo; as the cohort of interest</li>
            <li>For &ldquo;Maximum joinpoints,&rdquo; select 1 from the dropdown menu</li>
            <li>Click Calculate</li>
            <li>Examine the results. You will see that the model probably needs more joinpoints</li>
          </ol>
          <br />
          <h2 className="text-primary">Fit models with max no. of Joinpoint = 4 to NHL and CML</h2>
          <h5 className="text-primary">
            <i>Fitting complex joinpoint survival models to NHL and CML data</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-10.mp4" type="video/mp4" />
          <ol>
            <li>
              In the Cohort and Model Specifications box select both &ldquo;Non-Hodgkin Lymphoma&rdquo; and
              &ldquo;Chronic Myeloid Leukemia.&rdquo; In general, multiple cohorts can be selected at once, but this
              increases computation time, and an email address is required for a notification to be sent when results
              are available. &nbsp;
            </li>
            <li>In &ldquo;Maximum Joinpoints&rdquo; select 4 from the dropdown menu.</li>
            <li>Click the Calculate button.</li>
            <li>Type your email</li>
            <li>When you receive the e-mail, click &ldquo;View Results&rdquo;</li>
          </ol>
          <b>Advanced Options</b>
          <ul>
            <li>
              <b>Delete Last Interval:</b> The last interval can be deleted in case there is data instability in the
              last follow-up interval.
            </li>
            <li>
              <b>Minimum Number of Years between Joinpoints (Excluding Joinpoints):</b>
              If x is selected, joinpoints will be x years apart. The default value is 2.
            </li>
            <li>
              <b>Minimum Number of Years before First Joinpoint (Excluding Joinpoint):</b>
              If x is selected, the first joinpoint may be located at the (x+1)^th or later calendar year. The default
              value is 3.
            </li>
            <li>
              <b>Minimum Number of Years after Last Joinpoint (Excluding Joinpoint):</b>
              If x is selected, the last joinpoint can be located at (x+1) or more calendar years prior to the last
              calendar year. The default value is 5.
            </li>
            <li>
              <b>Number of Calendar Years of Projected Survival:</b>
              This specifies the calculation of projected survival up to x years from the last calendar year. The
              default value is 5.
            </li>
          </ul>
          <br />
          <h2 className="text-primary">Explore the results:</h2>
          <p>
            Users can export the cohort, model specification, and results, either to an Excel spreadsheet or a workspace
            file. Results can be exported to Excel via the &ldquo;Download Full Dataset&rdquo; option or to a workspace
            file via the &ldquo;Export Workspace&rdquo; option.
          </p>
          <p>
            JPSurv uses the minimum Bayesian Information Criterion (BIC) to select the best fitted model. The Akaike
            Information Criterion (AIC) is also provided. AIC tends to select models with a higher number of joinpoints.
            Graphs and other output features are available for other fitted models beyond the final selected model.
          </p>
          <p>
            Graphs display predicted (modeled) and observed survival or interval probabilities of death for each
            joinpoint model and cohorts. The default model displayed is the final selected model. However, the user can
            select other fitted models. The user can check &ldquo;Show Trend Measures&rdquo; and hit
            &ldquo;Recalculate&rdquo; to display the trend summary measures. All JPSurv plots are created using the
            ggplot2 R package [3].
          </p>
          <ul>
            <li>
              <b>Survival vs. Year of Diagnosis Graphs:</b> Users can select one or more values of interval years and
              produce the trend graph over all available years of diagnosis. The default is 5-year survival.
              <ul>
                <li>
                  <b>Trend measure- Average Absolute Change in Survival by Diagnosis Year:&nbsp;</b>These numbers
                  represent the average absolute difference in survival (either relative or cause-specific) for
                  individuals diagnosed in one calendar year compared to the prior year. This measure depends on
                  calendar year and the time since diagnosis as selected by the user. The average over calendar years is
                  reported.
                </li>
              </ul>
            </li>
            <li>
              <b>Death vs. Year of Diagnosis Graph:</b> The user can select one or more values of death interval years
              and produce the trend graph over all available years of diagnosis. The default is 5-year probability of
              death interval, which represents, given being alive at the end of the fourth year, the probability of
              dying of cancer between the 4<sup>th</sup> and 5<sup>th</sup> year from diagnosis.
              <ul>
                <li>
                  <b>Trend measure- Percent Change in the Interval Probability of Dying of Cancer by Diagnosis:</b>
                  These numbers represent the percent change in the interval probability of dying of cancer for those
                  diagnosed in one calendar year compared to the prior year. Because the fitted model assumes
                  proportional hazards, this trend measure is independent of time since diagnosis. Thus, it is the same
                  for probabilities of dying in any interval since diagnosis.
                </li>
              </ul>
            </li>
            <li>
              <b>Survival vs. Time Since Diagnosis Graph:</b> Users can select one or more calendar years and display
              modeled vs. observed survival by years since diagnosis.
            </li>
          </ul>
          <p>
            For certain graphs, users can display trend measures by checking the box &ldquo;Show Trend Measures.&rdquo;
            The annotation feature is only available when there are 3 or fewer intervals and models have 3 or fewer
            joinpoints. Model estimates are displayed in terms of the number and location of joinpoints, parameter
            estimates, and standard errors. Data displayed in graphs may be downloaded using the &ldquo;Download Graph
            Dataset&rdquo; option.
          </p>
          <br />
          <h5 className="text-primary">
            <i>Explore the joinpoint survival model results</i>
          </h5>
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-11a.mp4" type="video/mp4" />
          <br />
          <VideoPlayer src="https://cbiit.github.io/nci-webtools-dccps-seer/help-11b.mp4" type="video/mp4" />
          <ol>
            <li>
              How many joinpoints does the final selected model for NHL have, and in which years are the joinpoints
              located?
              <ol type="a">
                <li>Answer: The final selected model has 4 joinpoints located at 1983, 1994, 2002, and 2012</li>
                <li>
                  Note: Because the final model has 4 joinpoints, it would be advisable to test a model with 5
                  joinpoints
                </li>
              </ol>
            </li>
            <li>
              In which periods is survival increasing vs. decreasing? Click the &ldquo;Include Trend Measures -&gt;
              Between Joinpoints&rdquo; options and then click &ldquo;Recalculate.&rdquo;
              <ol type="a">
                <li>Answer: Survival is increasing for all periods except after 2012, the last identified joinpoint</li>
              </ol>
            </li>
            <li>
              Include 1-year in the graph with 5-year and 10-year cumulative survival. In &ldquo;Select years since
              diagnosis (follow-up) for survival plot and/or trend measures&rdquo; select x1.&nbsp;Click
              &ldquo;Recalculate.&rdquo;
            </li>
            <li>
              Look at the Death vs. Year at Diagnosis graphs. Include the model and data for the 1-year probability of
              death
            </li>

            <li>
              Produce a graph that shows cumulative survival by time since diagnosis for patients diagnosed in 1975 and
              another graph for patients diagnosed in 2009.
            </li>
          </ol>
          <br />
          <h2 className="text-primary">Save the data and results</h2>
          <p>
            You can save all the results and the data by selecting either &ldquo;Export Workspace&rdquo; or
            &ldquo;Download Full Dataset.&rdquo; You can retrieve the results by selecting and opening the workspace via
            the Workspace option under &ldquo;File Format.&rdquo;
          </p>
          <br />
          <h2 className="text-primary">References</h2>
          <ol>
            <li>
              Yu BB, Huang L, Tiwari RC, Feuer EJ, Johnson KA. Modelling population-based cancer survival trends by
              using join point models for grouped survival data. Journal of the Royal Statistical Society Series
              a-Statistics in Society. 2009;172:405-25
            </li>
            <li>
              Hakulinen T, Tenkanen L. Regression Analysis of Relative Survival Rates. Applied Statistics.
              1987;36(3):309-17.
            </li>
            <li>H. Wickham. ggplot2: Elegant Graphics for Data Analysis. Springer-Verlag New York, 2009.</li>
          </ol>
        </div>
      </article>
    </Container>
  );
}
