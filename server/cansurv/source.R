# History: 
# 2025-01-01 Update likelihood functions to fix the cure parameter
# 2025-01-06 Add code to compute cure fractions
# 2024-12-18 Update code to return data and objects in return list.
#            Update MLE functions to return survival estimates.   
# 2024-07-19 Change return value to 0 when no parms passed to fs_nLL_getProb
# 2024-07-17 Add input arguments for seed, maxiter, and convergence tol
# 2024-06-06 Let interval 1 be the reference as in the Cansurv software
# 2024-06-03 Begin adding code for semi-parametric
# 2024-02-12 Return vcov, update doc
# 2024-02-07 Fix error with intervals in function fs_setVecRows
#            Remove warning if p = 0
# 2024-02-06 Remove rows if any column is missing (to match CanSurv)
# 2024-02-05 Add option n_restart_conv for restarting when non-convergence
# 2024-02-02 Change arg no_cure to est.cure. If est_cure=FALSE, no cure parms are estimated.
# 2024-02-02 Check probs in likelihood function for 0 or 1 or non-finite values. 
#            Set min log arg to be 1e-300.
# 2024-01-31 Add option no_cure
# 2024-01-30 Make user input initial estimates more efficient
# 2024-01-29 Add option for initial estimates 
#            Rename flex_surv to CanSurv, covars to cure,
#            covars.cont to continuous
#
# NOTES: 
# The code requires the flexsurv and stats4 R packages to be loaded.
####################################################################################
# The main functions are:
#   CanSurv()           for model fitting
#   getProfileLoglike() get the data for the plot of profile likelihood L(c) vs c 
####################################################################################


############################
# Documentation for CanSurv
############################
# Input:
#   data        - Data frame containing all variables needed
#   dist        - One of "lnorm", "llogis", "weibull", "gompertz", or "semi-parametric".
#                 If "semi-parametric", then the options sigma and init_sigma
#                 are ignored. Otherwise, the option init_alpha is ignored.
#                 The default is "lnorm".
#   cure        - Names of the covariates for cure. If NULL, then only an
#                 intercept term will be estimated. See 'est_cure' below.
#   mu          - Names of the covariates for mu. If NULL, then only an
#                 intercept term will be estimated.
#   sigma       - Names of the covariates for sigma. If NULL, then only an
#                 intercept term will be estimated.
#   continuous  - Names of the continuous covariates. Any variable specified
#                 here and also in cure/mu/sigma will be regarded as continuous.
#   by          - Names of the by variables. An analysis is performed for eacho
#                 combination of the by variables.
#   time        - Name of the "time" variable. The default is "Interval".
#   alive       - Variable name for number of subjects alive at the start
#                 of the interval. The default is "Alive at Start".
#   died        - Variable name for number of subjects that died at the end
#                 of the interval. The default is "Died".
#   lost        - Variable name for number of subjects lost to follow-up.
#                 The default is "Lost to Followup".
#   exp_cum     - Variable name for cummulative expected survival. The default
#                 is Expected Survival (Cum)".
#   rel_cum     - Variable name for cummulative relative survival. The default
#                 is Relative Survival (Cum)".
#   print       - 0 or 1 to print information. The default is 1.
#   init_cure   - Named vector of initial estimates for cure. The names should be
#                 "(Intercept)", "x", "y.1", "y.2", ..., "y.m" for a continuous
#                 variable "x" and categorical variable "y".
#   init_mu     - Named vector of initial estimates for mu. The names should be
#                 "(Intercept)", "x", "y.1", "y.2", ..., "y.m" for a continuous
#                 variable "x" and categorical variable "y".
#   init_sigma  - Named vector of initial estimates for sigma. The names should be
#                 "(Intercept)", "x", "y.1", "y.2", ..., "y.m" for a continuous
#                 variable "x" and categorical variable "y".
#   init_alpha  - Vector of initial estimates for alpha. The length of this vector
#                 should be the number of intervals minus 1, for the parameter
#                 estimates of interval 2, ..., interval N.
#   est_cure    - TRUE or FALSE for whether cure is in the model.
#                 The default is FALSE.
#   n_restart_conv - The number of restarts when algorithm does not converge.
#                    The default is 100.
#   seed           - Seed.
#                    The default is 123.
#   maxit          - The maximum number of iterations in optim.
#                    The default is 100.
#   reltol         - The relative convergence tolerance in optim.
#                    The default is sqrt(.Machine$double.eps).
#
# Output: A list is returned with objects 'fit.list', 'varmap' and 'fit.list.by'.
#   The object varmap is a matrix of the original and normalized variable
#   names for variables that were used in the model.
#   The object fit.list.by is NULL when there were no by (strata) variables in the analysis,
#     and is a data frame of the by variables when there were by variables used
#     in the analysis. The rows of this data frame match the order of fit.list (below).
#   The object fit.list is a list of sublists, where each sublist contains
#   the objects 'fitlist', 'obj', and 'data'. The object 'data' is the data frame
#   that was used in the analysis and contains additional columns needed for 
#   creating plots. The columns in this data frame are normalized (see varmap below).
#   The additional columns for plots are: 
#     '.Surv.Act'       - The actuarial survival values  
#     '.Surv.Est'       - The estimated survival values
#     '.Dev.Resid'      - The deviance residuals
#     '.Cure.Fraction'  - The estimates of the cure fraction
#   The object 'obj' is a list containing information needed by function getKyearPlotData().
#   The object 'fitlist' is a list containing:
#     fit            - The return object from the mle function
#     converged      - TRUE or FALSE
#     message        - Error message if converged = FALSE
#     init.estimates - Initial estimates
#     init.loglike   - Initial loglikelihood
#     estimates      - Final estimates
#     loglike        - Final loglikelihood
#     vcov           - Variance-covariance matrix for estimates
#     by             - List of "by" (stratification) values

#####################################
# Documentation for getProfileLoglike
#####################################
# Input:
# fit   - A list containing 'fitlist', 'obj', and 'data', ie one of the model fits from CanSurv.
#         If there were no by (strata) variables, then this is fit.list[[1]]. If there were
#         strata variables, then it is fit.list[[i]] for stratum i (see fit.list.by).
# lower - The lower limit of the cure fraction. Must be >= 0. The default is 0. 
# upper - The upper limit of the cure fraction. Must have lower <= upper <= 1. The default is 1.
# step  - The step size. The default is 0.1.
#
# Output: A matrix with columns CureFraction and Loglike



CanSurv <- function(data, dist="lnorm", cure=NULL, mu=NULL, sigma=NULL, 
                      continuous=NULL, by=NULL,
                      time="Interval", alive="Alive at Start", died="Died", 
                      lost="Lost to Followup", exp_cum="Expected Survival (Cum)",
                      rel_cum="Relative Survival (Cum)", print=1,
                      init_cure=NULL, init_mu=NULL, init_sigma=NULL, init_alpha=NULL,
                      est_cure=FALSE, n_restart_conv=100, seed=123, maxit=100,
                      reltol=NULL, DEBUG=0) {

  # Check args
  fs_check_data(data) 
  fs_check_cols(data, cure, "cure")
  fs_check_cols(data, continuous, "continuous")
  fs_check_cols(data, mu, "mu")
  fs_check_cols(data, sigma, "sigma")
  fs_check_cols(data, by, "by")
  fs_check_cols(data, time, "time", len=1)
  fs_check_cols(data, alive, "alive", len=1)
  fs_check_cols(data, died, "died", len=1)
  fs_check_cols(data, lost, "lost", len=1)
  fs_check_cols(data, exp_cum, "exp_cum", len=1)
  fs_check_cols(data, rel_cum, "rel_cum", len=1)
  fs_check_dist(dist)
  fs_check_init(init_cure, "init_cure")
  fs_check_init(init_mu, "init_mu")
  fs_check_init(init_sigma, "init_sigma")
  fs_check_init(init_alpha, "init_alpha", incnms=0)
  est_cure <- fs_check_logical(est_cure, "est_cure", FALSE)
  n_restart_conv <- fs_check_int(n_restart_conv, "n_restart_conv", 5)
  seed           <- fs_check_int(seed, "seed", 123, min=NA)
  maxit          <- fs_check_int(maxit, "maxit", 100, min=1)
  reltol         <- fs_check_num(reltol, "reltol", sqrt(.Machine$double.eps), pos=1)
  set.seed(seed)  

  # Create list of objects
  obj <- list(cure=cure, continuous=continuous, 
              dist=dist, mu=mu, sigma=sigma, by=by,
              time=time, alive=alive, died=died, lost_fu=lost,
              exp_cum=exp_cum, rel_cum=rel_cum, print=print,
              user_cure=init_cure, user_mu=init_mu,
              user_sigma=init_sigma, user_alpha=init_alpha, est_cure=est_cure, 
              n_restart_conv=n_restart_conv, maxit=maxit, reltol=reltol, DEBUG=DEBUG)

  # Call main function
  ret <- fs_main(data, obj)

  ret
}

fs_main <- function(data, obj) {

  DEBUG <- obj$DEBUG
  if (DEBUG) cat("Begin: fs_main\n")

  # Name of intercept parm
  obj$intercept <- "(Intercept)"

  # For semi-parametric model
  obj$semi.flag <- obj$dist == "semi-parametric"
  if (obj$semi.flag) {
    obj$sigma      <- NULL
    obj$user_sigma <- NULL
  }

  # List of optim control parameters
  obj$control <- list(maxit=obj$maxit, reltol=obj$reltol)

  # Normalize variable names
  tmp  <- fs_normAllVarNames(data, obj)
  data <- tmp$data
  obj  <- tmp$obj
  tmp  <- NULL
  obj  <- fs_updateObj.0(data, obj) 
  tmp  <- fs_updatedata.0(data, obj)
  data <- tmp$data
  obj  <- tmp$obj
  tmp  <- NULL

  # Get the data frame of by variables
  byDF   <- fs_getByDF(data, obj)
  nby    <- 1
  byFlag <- length(byDF)
  prt    <- obj$print

  if (byFlag) nby <- nrow(byDF) 
  fit.list <- list()

  # Analysis for each by combination
  for (i in 1:nby) {  
    # Get subset to use
    tmp <- fs_getBySubset(data, byDF, i)

    # Run analysis
    if (byFlag && prt) {
      cat("\n*** Analysis for by variable(s):\n")
      print(byDF[i, , drop=FALSE])
    }
    tmp <- try(fs_analysis(data, obj, tmp), silent=TRUE)
    if (DEBUG) {
      if (is.list(tmp)) {
        print(tmp$fitlist$message)
      } else {
        print(tmp)
      }
    }

    # Save results
    len <- length(fit.list)
    fit.list[[len+1]] <- fs_getRetList1(tmp, byDF, i)
  }
  if (DEBUG) cat("End: fs_main\n")

  list(fit.list=fit.list, var.map=obj$varmap, fit.list.by=byDF)
}

fs_getRetList1 <- function(flist1, byDF, index) {

  if ("try-error" %in% class(flist1)) {
    msg     <- getErrorMsgFromTryError(flist1)
    fitlist <- list(converged=FALSE, message=msg)
  } else {
    fitlist <- getPlotData(flist1)
  }
  
  #by <- NULL
  #if (!is.null(byDF)) by <- as.list(byDF[index, , drop=FALSE])
  #fitlist$by <- by

  fitlist
}

fs_analysis <- function(data0, obj0, subset) {

  DEBUG <- obj0$DEBUG
  if (DEBUG) cat("Begin: fs_analysis\n")

  data <- data0[subset, , drop=FALSE]
  prt  <- obj0$print

  # Update objects and data
  obj  <- fs_updateObj(data, obj0) 
  data <- fs_updatedata(data, obj)

  # Get initial estimates
  obj <- fs_getInitialEst(data, obj)

  # Get MLEs
  fit <- try(fs_MLE(data, obj), silent=TRUE)

  # Check the fit and rerun if necessary
  fitlist <- fs_checkFitAndRerun(fit, data, obj)
  if (prt) fs_print_fitlist(fitlist)

  if (DEBUG) cat("End: fs_analysis\n")
  list(fitlist=fitlist, obj=obj, data=data)
}

fs_isFitOk <- function(fit) {

  msg  <- ""
  ret  <- FALSE
  cfit <- class(fit)
  if ("try-error" %in% cfit) {
    msg <- getErrorMsgFromTryError(fit)
  } else if ("mle" %in% cfit) {
    details <- fit@details
    conv    <- details$convergence
    if (!conv) {  
      cov <- fit@vcov
      #se  <- diag(cov)
      #tmp <- is.finite(se) & (se > 0)
      ee  <- eigen(cov, only.values=TRUE)$values 
      tmp <- ee > 0 
      tmp[is.na(tmp)] <- FALSE 
      if (all(tmp)) {
        ret <- TRUE
      } else {
        msg <- "Variance-covariance matrix is not positive definite"
      } 
    } else {
      msg <- paste0("Did not converge, code = ", conv)
    }
  } else {
    msg <- "Did not converge"
  }

  list(ok=ret, msg=msg)
}

fs_checkFitAndRerun <- function(fit, data, obj) {

  DEBUG <- obj$DEBUG
  if (DEBUG) cat("Begin: fs_checkFitAndRerun\n")

  semi.flag <- obj$semi.flag
  prt       <- obj$print
  tmp       <- fs_isFitOk(fit)
  ok        <- tmp$ok
  msg       <- tmp$msg
  if (ok) obj$loglike <- logLik(fit)

  if (DEBUG) fs_print_fit(fit, obj)

  if (!ok) {
    nrestart <- obj$n_restart_conv
    cure0    <- obj[["init_cure", exact=TRUE]]
    mu0      <- obj[["init_mu", exact=TRUE]]
    if (semi.flag) {
      alpha0 <- obj[["init_alpha", exact=TRUE]]
    } else {
      sigma0 <- obj[["init_sigma", exact=TRUE]]
    }
    for (i in seq_len(nrestart)) {
      # Get new initial estimates
      obj$init_cure  <- fs_getRestartInit(cure0, obj)
      obj$init_mu    <- fs_getRestartInit(mu0, obj)
      if (semi.flag) {
        obj$init_alpha <- fs_getRestartInit(alpha0, obj)
      } else {
        obj$init_sigma <- fs_getRestartInit(sigma0, obj)
      }
      obj$ll0        <- fs_MLE(data, obj, only.loglike=1)
      fit            <- try(fs_MLE(data, obj), silent=TRUE)
      tmp            <- fs_isFitOk(fit)
      ok             <- tmp$ok
      msg            <- tmp$msg
      if (ok) obj$loglike <- logLik(fit)  
      if (DEBUG) {
        cat(paste0("\nRestart #", i, "\n"))
        #fs_print_fit(fit, obj)
        #print(fit)
      }
      if (ok) break
    }
  } 
  
  # Create return fit object
  fitlist <- list(fit=fit, converged=ok, message=msg,
                  init.estimates=fs_getInitVector(obj), init.loglike=obj$ll0)
  if (ok) {
    sfit              <- summary(fit)
    fitlist$estimates <- sfit@coef
    fitlist$loglike   <- obj$loglike
    fitlist$vcov      <- fit@vcov 
  }

  if (DEBUG) cat("End: fs_checkFitAndRerun\n")
  fitlist
} 

fs_getRestartInit <- function(x, obj) {

  ret <- NULL
  n   <- length(x)
  if (n) {
    ret <- x + runif(n, min=-1, max=1)
  }
  ret
} 

fs_print_fitlist <- function(fitlist) {

  cat("Initial estimates:\n")
  print(fitlist$init.estimates)
  cat(paste0("Initial loglike = ", fitlist$init.loglike, "\n"))
  ok <- fitlist$converged
  if (ok) {
    cat(paste0("Final   loglike = ", fitlist$loglike, "\n"))
    cat("Final estimates:\n")
    print(fitlist$estimates)
  } else {
    cat(fitlist$msg)
  }
  
  invisible(NULL)
}

fs_print_fit <- function(fit, obj) {

  flag <- "mle" %in% class(fit)
  fs_print_init(obj)
  
  cat(paste0("Initial loglike = ", obj$ll0, "\n"))
  if (flag) {
    cat(paste0("Final   loglike = ", obj$loglike, "\n"))
    cat("Final estimates:\n")
    print(fit@coef)
  } else {
    cat("Model did not converge\n")
  }
  
  invisible(NULL)
}

fs_getByDF <- function(data, obj) {

  by  <- obj[["by", exact=TRUE]]
  nby <- length(by)
  if (!nby) return(NULL)

  x <- unique(data[, by, drop=FALSE])

  # Order
  for (i in nby:1) x <- x[order(x[, i, drop=TRUE]), , drop=FALSE]

  rownames(x) <- NULL
  x
}

fs_getBySubset <- function(data, byDF, row) {

  ret <- rep(TRUE, nrow(data))
  if (!length(byDF)) return(ret)

  vars <- colnames(byDF)
  VEC  <- byDF[row, , drop=FALSE]
  for (i in 1:length(vars)) {
    v   <- vars[i]
    ret <- ret & (data[, v, drop=TRUE] == VEC[1, v])
  } 
  tmp <- is.na(ret)
  if (any(tmp)) ret[tmp] <- FALSE

  ret
}

fs_getNint <- function(data, time) {

  vec <- data[, time, drop=TRUE]
  ret <- max(vec)

  ret
}

fs_add_exp_int <- function(data, obj) {

  exp_cum <- data[, obj$exp_cum, drop=TRUE]
  died    <- data[, obj$died, drop=TRUE]
  lost_fu <- data[, obj$lost_fu, drop=TRUE]
  alive   <- data[, obj$alive, drop=TRUE]
  time    <- data[, obj$time, drop=TRUE]

  vec <- fs_setVecRows(exp_cum, time) 
  v1  <- 1 - died/(alive - lost_fu/2)
  v2  <- pmax(v1, vec)

  #vec <- pmin(rep(0.999999999999, nrow(data)), v2) 
  vec <- pmin(rep(1, nrow(data)), v2) 
  data[, obj$exp_int] <- vec
  data
}

fs_updateObj.0 <- function(data, obj) {

  # Error check for overlapping variables
  fs_checkAllOverlap(obj) 

  obj$cure       <- unique(obj[["cure", exact=TRUE]])
  obj$mu         <- unique(obj[["mu", exact=TRUE]])
  obj$sigma      <- unique(obj[["sigma", exact=TRUE]])
  obj$by         <- unique(obj[["by", exact=TRUE]])
  obj$continuous <- unique(obj[["continuous", exact=TRUE]])

  obj
}

fs_updateObj <- function(data, obj) {

  obj[["exp_int"]] <- "exp_int"
  nint             <- fs_getNint(data, obj$time) # max number of intervals
  obj$nint         <- nint
  timevec          <- data[, obj$time, drop=TRUE]
  tmp0             <- timevec %in% 1
  nsets            <- sum(tmp0)
  nr               <- nrow(data)
  obj$nsets        <- nsets
  if (nr < 1) stop("ERROR: too few rows of data")
  if (timevec[1] != 1) stop("ERROR: first interval is not 1")

  # Get start/stop rows and check intervals
  # !!! If time is not 1:nint, then change fs_MLE !!!
  start       <- rep(NA, nsets)
  stop        <- rep(NA, nsets)
  ind         <- 1
  t0          <- 1
  start[1]    <- 1
  stop[nsets] <- nr
  if (nr > 1) {
    for (i in 2:nr) {
      t1 <- timevec[i]
      if (t1 == 1) {
        stop[ind]  <- i - 1
        ind        <- ind + 1
        start[ind] <- i
      } else if (t1 != t0 + 1) stop(paste0("ERROR with interval on row ", i))
      t0 <- t1
    }
  }
  if (any(is.na(start))) stop("ERROR with starting rows")
  if (any(is.na(stop))) stop("ERROR with ending rows")     
  obj$set.start <- start
  obj$set.stop  <- stop

  # Number of intervals per set
  obj$set.nint <- stop - start + 1

  # For semi-parametric method, get rows of alpha to create vector in MLE func
  if (obj$semi.flag) {
    vec      <- NULL
    set.nint <- obj$set.nint
    nsets    <- length(set.nint)
    zero     <- rep(NA, nsets)
    for (i in 1:nsets) {
      tmp     <- 1:set.nint[i]
      zero[i] <- length(vec) + 1
      vec     <- c(vec, tmp)
    }
    obj$alpha.rows      <- vec
    obj$alpha.zero.rows <- zero
  }

  obj
}

fs_updatedata.0 <- function(data, obj) {

  cure        <- obj[["cure", exact=TRUE]] 
  mu          <- obj[["mu", exact=TRUE]] 
  sigma       <- obj[["sigma", exact=TRUE]] 
  covars.cont <- obj[["continuous", exact=TRUE]]
  covars      <- unique(c(cure, mu, sigma))
  tmp         <- !(covars %in% covars.cont)
  covars      <- covars[tmp]

  # Check data for special characters
  tmp  <- fs_setupData(data, obj) 
  data <- tmp$data
  obj  <- tmp$obj
  tmp  <- NULL

  # create dummy vars for all categorical covars
  covars.dvars <- list()
  if (length(covars)) {
    for (var in covars) {
      tmp   <- fs_addDummyVars(data, var) 
      data  <- tmp$data
      dvars <- tmp$vars
      covars.dvars[[var]] <- dvars
    }
  }
  obj$covars.dvars <- covars.dvars

  if (length(covars.cont)) {
    for (var in covars.cont) {
      data[, var] <- as.numeric(fs_unfactor(data[, var, drop=TRUE]))
    }
  }   
  
  # Do not drop variables
  #data <- fs_subsetData(data, obj)

  # Add intercept
  data[, obj$intercept] <- 1

  # All cont covars for cure, mu, sigma (does not include intercept parm)
  obj$all.cure  <- fs_getContVars(obj, obj[["cure", exact=TRUE]])
  obj$all.mu    <- fs_getContVars(obj, obj[["mu", exact=TRUE]])
  obj$all.sigma <- fs_getContVars(obj, obj[["sigma", exact=TRUE]])

  list(data=data, obj=obj)
}

fs_setupData <- function(data, obj) {

  nms  <- fs_getNumericObjVarNames()
  tmp  <- nms %in% names(obj)
  nms  <- nms[tmp]
  if (!length(nms)) return(list(data=data, obj=obj))

  # Consider all variables
  #vars  <- unlist(obj[nms]) 
  vars  <- colnames(data)
  nvars <- length(vars) 
  nr    <- nrow(data)
  rem   <- rep(FALSE, nr)
  for (v in vars) {
    vec  <- data[, v, drop=TRUE]
    vec2 <- suppressWarnings(as.numeric(vec))
    tmp  <- !is.finite(vec2)
    if (any(tmp)) {
      msg <- paste0("Non-numeric data for variable '", v, "'")
      warning(msg)

      # Try removing the special characters
      str      <- "[_~`'!@#$%^&*()+={}|\ ;<>?//]"
      vec[tmp] <- gsub(str, "", vec[tmp], perl=TRUE)
      vec2     <- as.numeric(vec)
      tmp      <- !is.finite(vec2)
      if (any(tmp)) {
        # Remove rows
        rem <- rem | tmp
      }
    }
    data[, v] <- vec2
  }
  if (any(rem)) {
    rows <- (1:nr)[rem]
    str  <- paste0(rows, collapse=", ")
    msg  <- paste0("Rows ", str, " have been removed from the data")
    warning(msg) 
    data <- data[!rem, , drop=FALSE]
    obj$removed.rows <- rows
  }
  nr <- nrow(data)
  if (nr < 1) stop("ERROR: too many rows of data removed")
  rownames(data) <- 1:nr

  list(data=data, obj=obj)
}

fs_updatedata <- function(data, obj) {

  # Add variable exp_int
  data <- fs_add_exp_int(data, obj) 

  data
}

fs_subsetData <- function(data, obj) {

  dvars <- unlist(obj[["covars.dvars", exact=TRUE]])
  all.vars <- c(dvars, obj[["continuous", exact=TRUE]], 
              obj[["mu", exact=TRUE]], obj[["sigma", exact=TRUE]],
              obj[["time", exact=TRUE]], obj[["alive", exact=TRUE]], 
              obj[["died", exact=TRUE]], obj[["lost_fu", exact=TRUE]],
              obj[["exp_cum", exact=TRUE]], obj[["rel_cum", exact=TRUE]],
              obj[["exp_int", exact=TRUE]], obj[["by", exact=TRUE]])
  all.vars <- unique(all.vars)
  tmp      <- all.vars %in% colnames(data)
  all.vars <- all.vars[tmp]

  data <- data[, all.vars, drop=FALSE]
  data
}

fs_addDummyVars <- function(data, var) {

  vec   <- data[, var, drop=TRUE]
  levs  <- sort(unique(vec))
  
  # first one will be the reference
  levs  <- levs[-1]
  nlevs <- length(levs)
  if (!nlevs) stop(paste0(var, " has one level"))

  new <- rep("", nlevs)
  for (i in 1:nlevs) {
    lev       <- levs[i]
    v         <- paste0(var, ".", lev)
    new[i]    <- v 
    data[, v] <- as.numeric(vec %in% lev) 
  }

  list(data=data, vars=new)
}

fs_unfactor <- function(fac) {

  if (is.factor(fac)) {
    ret <- levels(fac)[fac]
  } else {
    ret <- fac
  }
  ret
}

fs_getFormula <- function(yvar, covars) {

  if (length(covars)) {
    cstr <- paste0(covars, collapse=" + ")
  } else {
    cstr <- "1"
  }
  form <- paste0(yvar, " ~ ", cstr)
  form
}

fs_getAllObjVarNames <- function() {

  # Names in the obj list
  ret <- c("cure", "continuous", "mu", "sigma", "time",
           "alive", "died", "lost_fu", "exp_cum", "rel_cum",
           "by") 

  # function argument names
  args <- c("cure", "continuous", "mu", "sigma", "time",
           "alive", "died", "lost", "exp_cum", "rel_cum",
           "by") 
  
  names(ret) <- args
  ret
}

fs_getNumericObjVarNames <- function() {

  # Names in the obj list
  ret <- c("continuous", "time",
           "alive", "died", "lost_fu", "exp_cum", "rel_cum") 

  # function argument names
  args <- c("continuous", "time",
           "alive", "died", "lost", "exp_cum", "rel_cum") 
  
  names(ret) <- args
  ret
}

# Function to normalize variable names
fs_normAllVarNames <- function(data, obj) {

  # Instead of renaming variables, add in a new column with normalized name
  cx0 <- colnames(data)
  cx  <- fs_normVarNames(cx0)
  tmp <- cx != cx0
  if (any(tmp)) {
    cx0 <- cx0[tmp]
    cx  <- cx[tmp]
    for (i in 1:length(cx)) data[, cx[i]] <- data[, cx0[i], drop=TRUE]
  }  

  nms <- fs_getAllObjVarNames()
  map <- NULL
  for (nm in nms) {
    orig <- obj[[nm, exact=TRUE]]
    if (length(orig)) {
      new       <- fs_normVarNames(orig)
      obj[[nm]] <- new
      tmp       <- cbind(orig, new)
      map       <- rbind(map, tmp)
    }
  }

  # Initial estimate names, leave "(Intercept)" unchanged 
  nms <- c("user_cure", "user_mu", "user_sigma")
  int <- obj$intercept

  for (nm in nms) {
    vec <- obj[[nm, exact=TRUE]]
    if (length(vec)) {
      orig       <- names(vec)
      tmpint     <- orig %in% int
      new        <- fs_normVarNames(orig)
      if (any(tmpint)) new[tmpint] <- int
      names(vec) <- new 
      obj[[nm]]  <- vec
      tmp        <- cbind(orig, new)
      map        <- rbind(map, tmp)
    }
  }
 
  if (length(map)) colnames(map) <- c("Original", "New")
  obj$varmap <- unique(map)

  list(data=data, obj=obj)
}

fs_normVarNames <- function(cvec) {

  ret <- trimws(cvec)
  ret <- gsub("\\s+", " ",      ret) 
  ret <- gsub(">=",   "_GTEQ_", ret, fixed=TRUE)
  ret <- gsub("<=",   "_LTEQ_", ret, fixed=TRUE)
  ret <- gsub("==",   "_EQ_",   ret, fixed=TRUE)
  ret <- gsub(">",    "_GT_",   ret, fixed=TRUE)
  ret <- gsub("<",    "_LT_",   ret, fixed=TRUE)
  ret <- gsub("%in%", "_IN_",   ret, fixed=TRUE)
  ret <- gsub("!=",   "_NEQ_",  ret, fixed=TRUE)
  ret <- gsub("=",    "_EQ_",   ret, fixed=TRUE)
  ret <- gsub(", ",   "_",      ret, fixed=TRUE)
  ret <- gsub(" ",    ".",      ret, fixed=TRUE)
  ret <- gsub("-",    "_",      ret, fixed=TRUE)
  ret <- gsub(",",    "_",      ret, fixed=TRUE)
  str <- "[~`'!@#$%^&*()+={}|\ ;<>?//]"
  ret <- gsub(str, "", ret, perl=TRUE)
  ret
}

fs_setVecRows <- function(vec, int) {

  # int is the vector of intervals

  N <- length(vec)
  if (N != length(int)) stop("ERROR")
  ret      <- rep(NA, N)
  nint     <- max(int) 
  rows0    <- 1:N
  tmp      <- int == 1
  ret[tmp] <- vec[tmp]
  if (nint > 1) {
    for (i in 2:nint) {
      tmp     <- int == i
      r1      <- rows0[tmp]
      r0      <- r1 - 1
      ret[r1] <- vec[r1]/vec[r0]
    }
  }
 
  ret
}

getErrorMsgFromTryError <- function(obj) {

  ret <- NULL
  if ("try-error" %in% class(obj)) {
    msg <- attr(obj, "condition")
    ret <- msg[["message", exact=TRUE]]
  }
 
  ret
} 

##########################
# Check args functions
##########################
isString <- function(x) {
  (length(x) == 1) && is.character(x)
}

fs_getQuotedStr <- function(x, sep=", ") {
  vec <- paste0("'", x, "'")
  ret <- paste0(vec, collapse=", ")
  ret
}

fs_check_logical <- function(x, nm, def) {

  if (!length(x)) x <- def
  if ((length(x) > 1) || !(x %in% 0:1)) {
    stop(paste0("ERROR: ", nm, " must be TRUE or FALSE"))
  }
  x
}

fs_check_int <- function(x, nm, def, min=0) {

  if (!length(x)) x <- def
  if (!is.finite(x) || (length(x) != 1) || (x != floor(x))) {
    stop(paste0("ERROR: ", nm, " must be an integer"))
  }
  if (!is.na(min) && (x < min)) {
    stop(paste0("ERROR: ", nm, " must be >= ", min))
  }

  x
}

fs_check_num <- function(x, nm, def, pos=0, nonneg=0, maxeq=NULL, maxlt=NULL) {

  if (!length(x)) x <- def
  if (!is.finite(x) || (length(x) != 1)) {
    stop(paste0("ERROR: ", nm, " must be a number"))
  }
  if (pos && (x <= 0)) {
    stop(paste0("ERROR: ", nm, " must be positive"))
  }
  if (nonneg && (x < 0)) {
    stop(paste0("ERROR: ", nm, " must be non-negative"))
  }
  if (length(maxeq) && (x > maxeq)) {
    stop(paste0("ERROR: ", nm, " must be <= ", maxeq))
  }
  if (length(maxlt) && (x >= maxlt)) {
    stop(paste0("ERROR: ", nm, " must be < ", maxlt))
  }

  x
}


fs_check_data <- function(x, nm="data") {

  if (!is.data.frame(x)) stop(paste0("ERROR: ", nm, " must be a data frame"))
  if (!ncol(x)) stop(paste0("ERROR: ", nm, " has no columns"))
  nr <- nrow(x)
  if (!nr) stop(paste0("ERROR: ", nm, " has no rows"))
  if (nr < 1) stop(paste0("ERROR: ", nm, " has no rows"))
  NULL
}

fs_check_cols <- function(data, cols, nm, len=0) {

  ncols <- length(cols)
  if (len && (len != ncols)) {
    msg <- paste0("ERROR: input argument '", nm, "' must have length ", len)
    stop(msg)
  }
  if (!ncols) return(NULL)
  tmp <- !(cols %in% colnames(data))
  if (any(tmp)) {
    miss  <- cols[tmp]
    nmiss <- length(miss)
    str   <- fs_getQuotedStr(miss, sep=", ")
    if (nmiss > 1) {
      msg <- paste0("ERROR: the variables ", str, " were not found in the data")
    } else {
      msg <- paste0("ERROR: the variable ", str, " was not found in the data")
    }
    stop(msg)
  }
  NULL
}

fs_check_dist <- function(x, nm="dist") {

  valid <- c("lnorm", "llogis", "weibull", "gompertz", "semi-parametric")
  estr  <- fs_getQuotedStr(valid, sep=", ")
  msg   <- paste0("ERROR: ", nm, " must be one of ", estr)
  if (!isString(x)) stop(msg)
  if (!(x %in% valid)) stop(msg)
  NULL
}

fs_checkAllOverlap <- function(obj) {

  var.objnms <- fs_getAllObjVarNames()

  # Check arg vs other args
  fs_checkOverlap("time", var.objnms, obj)
  fs_checkOverlap("by", var.objnms, obj)
  fs_checkOverlap("alive", var.objnms, obj)
  fs_checkOverlap("died", var.objnms, obj)
  fs_checkOverlap("lost_fu", var.objnms, obj)
  fs_checkOverlap("rel_cum", var.objnms, obj)
  fs_checkOverlap("exp_cum", var.objnms, obj)
  NULL
}

fs_checkOverlap <- function(v1, v2, obj) {

  # v1 has length 1 
  # v2 a vector     
  if (length(v1) != 1) stop("ERROR1")
  args <- names(v2)
  id   <- match(v1, v2)
  if (is.na(id)) {
    arg1 <- v1
  } else {
    arg1 <- args[id]
  }
  tmp  <- !(v2 %in% v1)
  v2   <- v2[tmp]
  args <- names(v2)
  nv2  <- length(v2)
  if (!nv2) stop("ERROR2")
  
  for (i in 1:nv2) fs_checkOverlap1(v1, v2[i], obj, arg1, args[i])
  
  NULL
}

fs_checkOverlap1 <- function(objnm1, objnm2, obj, nm1, nm2) {

  v1 <- obj[[objnm1, exact=TRUE]]
  v2 <- obj[[objnm2, exact=TRUE]]
  n1 <- length(v1)
  n2 <- length(v2)
  if (!n1 || !n2) return(NULL)

  tmp <- v1 %in% v2
  if (!any(tmp)) return(NULL)
  err <- v1[tmp]
  str <- fs_getQuotedStr(err, sep=", ")
  msg <- paste0("ERROR: the variable(s) ", str, " appear in both the '", nm1,
                "' and '", nm2, "' arguments")
  stop(msg) 
  NULL
}

fs_check_init <- function(x, nm, incnms=1) {

  n <- length(x)
  if (!n) return(NULL)
  if (!is.numeric(x) || !is.vector(x)) {
    stop(paste0("ERROR: ", nm, " must be a numeric vector"))
  }
  if (incnms) {
    nms <- names(x)
    if (!length(nms)) stop(paste0("ERROR: ", nm, " must have parameter names"))
  }
  tmp <- !is.finite(x)
  if (any(tmp)) stop(paste0("ERROR: ", nm, " contains non-finite values"))

  NULL
}

fs_check_list <- function(x, nm, must.inc=NULL) {

  if (!is.list(x)) stop(paste0("ERROR: ", nm, " must be a list"))
  if (length(must.inc)) {
    tmp  <- !(must.inc %in% names(x))
    miss <- must.inc[tmp]
    if (length(miss)) {
      miss <- paste0("'", miss, "'")
      str  <- paste0(miss, collapse=", ")
      msg  <- paste0("ERROR: ", nm, " is missing objects ", str)
      stop(msg) 
    }
  }
  NULL
}

###########################
# Initial estimates
###########################

fs_getNparmsToEst <- function(obj) {

  ncure  <- length(obj[["all.cure", exact=TRUE]]) + obj$est_cure
  nmu    <- length(obj[["all.mu", exact=TRUE]]) + 1
  nsigma <- length(obj[["all.sigma", exact=TRUE]])
  nalpha <- obj$nint - 1
  if (obj$semi.flag) {
    ret <- ncure + nmu + nalpha
  } else {
    ret <- ncure + nmu + nsigma
  }
  ret
}

fs_getInitialEst <- function(data, obj) {

  DEBUG <- obj$DEBUG
  if (DEBUG) cat("Begin: fs_getInitialEst\n") 

  # Check number of parameters to be estimated against total df
  np  <- fs_getNparmsToEst(obj)
  nr  <- nrow(data)
  if (np == nr) {
    msg <- "Number of parameters equals the number of degrees of freedom!"
    warning(msg)
  } else if (np > nr) {
    msg <- "\nERROR: Number of parameters exceeds the maximum degrees of freedom!\n"
    cat(msg)
    stop(msg)
  }

  semi.flag <- obj$semi.flag
  est_cure  <- obj$est_cure

  # Get initial estimates for covars (cure)
  tmp <- try(fs_init_covars(data, obj), silent=TRUE)
  if ("try-error" %in% class(tmp)) {
    obj$init_cure <- fs_getDefInit("all.cure", obj)
  } else {
    obj$init_cure <- tmp
  }

  # Get adj weights
  adj_weights <- fs_getAdjWgts(data, obj)

  # Initial estimates for mu and sigma
  tmp <- try(fs_getInitMuSigma(data, obj, adj_weights), silent=TRUE)
  if ("try-error" %in% class(tmp)) {
    obj$init_mu    <- fs_getDefInit("all.mu", obj)
    obj$init_sigma <- fs_getDefInit("all.sigma", obj)
  } else {
    obj$init_mu    <- tmp$mu
    obj$init_sigma <- tmp$sigma
  }
  if (semi.flag) obj$init_sigma <- NULL

  # For the semi-parametric model with cure = FALSE, re-initialize the intercept.
  if (semi.flag && !est_cure) {
    tmp <- data[, obj$time, drop=TRUE] %in% 1
    n0  <- data[tmp, obj$alive, drop=TRUE]
    d   <- data[tmp, obj$died, drop=TRUE]
    l   <- data[tmp, obj$lost_fu, drop=TRUE]
    tmp <- d %in% 0
    if (any(tmp)) d[tmp] <- 0.5
    n   <- n0 - l
    s   <- (n - d)/n
    s0  <- d/n
    vec <- -log(log(s)/log(s0))
    tmp <- mean(vec, na.rm=TRUE)
    if (!is.finite(tmp)) {
      warning("Initial estimate for the intercept could not be determined")
      tmp <- 0 
    }
    obj$init_mu[1] <- tmp
  }

  # Initial estimates for alpha. For now let them decrease from 0.1 to -1.1.
  if (obj$semi.flag && (obj$nint > 1)) {
    nint <- obj$nint - 1 # Let interval 1 be the reference
    a    <- 0.1
    b    <- -1.1 
    h    <- (b - a)/nint
    tmp  <- a + (1:nint)*h
    names(tmp) <- paste0("alpha", 2:(length(tmp)+1))
    obj$init_alpha <- tmp
  }

  # User defined initial estimates
  obj <- fs_setUserInit(obj)

  # Initial loglike
  obj$ll0 <- fs_MLE(data, obj, only.loglike=1)

  if (DEBUG) cat("End: fs_getInitialEst\n") 
  obj
}

fs_getDefInit <- function(nm, obj) {

  x <- obj[[nm, exact=TRUE]]
  if (!length(x) && (nm == "all.cure")) return(NULL)
  
  # Add intercept
  x   <- c(obj$intercept, x)
  n   <- length(x)
  ret <- rep(0, n)
  names(ret) <- x

  ret
}

fs_setUserInit <- function(obj) {

  vec <- obj[["init_cure", exact=TRUE]]      
  lst <- obj[["user_cure", exact=TRUE]] 
  obj$init_cure <- fs_setUserInit1(vec, lst, "init_cure")

  vec <- obj[["init_mu", exact=TRUE]]      
  lst <- obj[["user_mu", exact=TRUE]] 
  obj$init_mu <- fs_setUserInit1(vec, lst, "init_mu")

  if (!obj$semi.flag) {
    vec <- obj[["init_sigma", exact=TRUE]]      
    lst <- obj[["user_sigma", exact=TRUE]] 
    obj$init_sigma <- fs_setUserInit1(vec, lst, "init_sigma")
  } else {
    vec  <- obj[["init_alpha", exact=TRUE]]    
    len0 <- length(vec)  
    lst  <- obj[["user_alpha", exact=TRUE]] 
    len  <- length(lst)
    if (len && len0) {
      m              <- min(c(len0, len))
      vec[1:m]       <- lst[1:m]
      obj$init_alpha <- vec
    }
  }

  obj
}

fs_setUserInit1 <- function(vec, uservec, nm) {

  if (!length(vec) || !length(uservec)) return(vec)
  ret  <- vec
  vnms <- names(vec)
  unms <- names(uservec)
  tmp  <- !(vnms %in% unms)
  miss <- vnms[tmp]
  if (length(miss)) {
    str <- fs_getQuotedStr(miss, sep=", ")
    msg <- paste0("The parameters ", str, " were not found in ", nm)
    warning(msg)
  }
  nms <- vnms[!tmp]
  if (length(nms)) ret[nms] <- uservec[nms]
  
  ret
}

fs_getInitVector <- function(obj) {

  x1 <- obj[["init_cure", exact=TRUE]]
  x2 <- obj[["init_mu", exact=TRUE]]
  x3 <- obj[["init_sigma", exact=TRUE]]
  x4 <- obj[["init_alpha", exact=TRUE]] # has names alpha1 ... alphan
  if (length(x1)) names(x1) <- paste0("cure.", names(x1))
  if (length(x2)) names(x2) <- paste0("mu.", names(x2)) 
  if (length(x3)) names(x3) <- paste0("sigma.", names(x3))
  if (obj$semi.flag) {
    ret <- c(x1, x2, x4)
  } else {
    ret <- c(x1, x2, x3)
  }
  ret
}

fs_print_init <- function(obj) {

  x <- fs_getInitVector(obj)
  cat("\nInitial estimates:\n")
  print(x)
  cat("\n")
  NULL
}

fs_getInitWeights <- function(data, obj) {

  # Starting rows for each set
  tmp1         <- obj$set.start
  init_weights <- data[tmp1, obj[["alive", exact=TRUE]], drop=TRUE]
  init_weights
}

fs_init_covars <- function(data, obj) {

  covs <- obj[["all.cure", exact=TRUE]]
  if (!length(covs)) covs <- NULL
  if (!obj$est_cure) return(NULL)

  # See if user specified ALL initial cure parms
  ivec <- obj[["user_cure", exact=TRUE]] 
  if (length(ivec)) {
    nms   <- names(ivec)
    parms <- c(obj$intercept, covs)
    if (all(parms %in% nms)) {
      return(ivec[parms])
    }
  }
  
  # Ending rows for each set
  tmp0         <- obj$set.stop
  dat          <- data[tmp0, , drop=FALSE]
  vec          <- -log(1/dat[, obj[["rel_cum", exact=TRUE]], drop=TRUE] - 1)
  tmp          <- !is.finite(vec)
  if (any(tmp)) {
    # Try expected
    vec[tmp] <- -log(1/dat[tmp, obj[["exp_cum", exact=TRUE]], drop=TRUE] - 1)
    tmp      <- !is.finite(vec)
    if (any(tmp)) vec[tmp] <- 0
  } 
  dat[, "y"]   <- vec
  init_weights <- fs_getInitWeights(data, obj)
  form         <- as.formula(fs_getFormula("y", covs))
  fit          <- lm(form, data=dat, weights=init_weights)
  init_c       <- coef(fit)
  init_c
}

fs_getAdjWgts <- function(data, obj) {

  nr          <- nrow(data)
  adj_weights <- rep(0, nr)
  rel_cum     <- data[, obj$rel_cum, drop=TRUE]

  # repeated ending rows
  fvec <- rep(obj$set.stop, times=obj$set.nint)
  if (length(fvec) != nr) stop("ERROR 1")
  vec1 <- 1 - rel_cum + 0.0001
  vec3 <- 1 - rel_cum[fvec]
  tmp  <- vec3 <= 0
  tmp[is.na(tmp)] <- TRUE
  if (any(tmp)) vec3[tmp] <- 0.0001

  vec2 <- vec1/vec3
  vec4 <- (rel_cum[1:(nr-1)]-rel_cum[2:nr]+0.0001)/vec3[2:nr]
  vec4 <- c(NA, vec4)

  # starting rows
  tmp0               <- 1:nr %in% obj$set.start
  adj_weights[tmp0]  <- vec2[tmp0]
  adj_weights[!tmp0] <- vec4[!tmp0]

  adj_weights
}

fs_getContVars <- function(obj, vars) {

  if (!length(vars)) return(NULL)
  dlist <- obj[["covars.dvars", exact=TRUE]]
  if (!length(dlist)) return(vars)
  catnms   <- names(dlist)
  tmp      <- vars %in% catnms
  catvars  <- vars[tmp]
  contvars <- vars[!tmp]
  ret      <- NULL
  if (length(catvars)) ret <- c(ret, unlist(dlist[catvars]))
  if (length(contvars)) ret <- c(ret, contvars)   
  ret
}

fs_getInitMuSigma <- function(data, obj, adj_weights) {

  muvars    <- obj$all.mu
  sigvars   <- obj$all.sigma
  semi.flag <- obj$semi.flag

  # See if user specified ALL initial estimates for mu and sigma
  imuvec <- obj[["user_mu", exact=TRUE]] 

  if (!semi.flag) {
    isigvec <- obj[["user_sigma", exact=TRUE]]
    if (length(imuvec) && length(isigvec)) { 
      int      <- obj$intercept
      muparms  <- c(int, muvars)
      sigparms <- c(int, sigvars)
      flag1    <- all(muparms %in% names(imuvec))
      flag2    <- all(sigparms %in% names(isigvec))
      if (flag1 && flag2) {
        ret <- list(mu=imuvec[muparms], sigma=isigvec[sigparms])
        return(ret)
      }
    }
  } else {
    if (length(imuvec)) { 
      int      <- obj$intercept
      muparms  <- c(int, muvars)
      flag1    <- all(muparms %in% names(imuvec))
      if (flag1) {
        ret <- list(mu=imuvec[muparms], sigma=NULL)
        return(ret)
      }
    }
  }

  nsets      <- obj$nsets
  set.nint   <- obj$set.nint
  avec       <- obj$set.start
  bvec       <- obj$set.stop
  init_mu    <- rep(0, nsets)
  init_sigma <- rep(0, nsets)
  if (semi.flag) {
    dist <- "weibull" # for flexsurvreg function below
  } else {
    dist <- obj$dist
  }
  
  timevec    <- data[, obj$time, drop=TRUE]   

  for (i in 1:nsets) {
    a      <- avec[i]
    b      <- bvec[i]
    svec   <- a:b
    onevec <- rep(1, set.nint[i])

    fit <- try(flexsurvreg(Surv(timevec[svec], onevec)~1, weights=adj_weights[svec], dist=dist),
                           silent=TRUE)
    model_coef <- coef(fit)

    if (dist=="lnorm") {
      init_mu[i]    <- model_coef["meanlog"]
      init_sigma[i] <- model_coef["sdlog"]
    } else if (dist=="llogis") {
      init_mu[i]    <-  model_coef["scale"]
      init_sigma[i] <- -model_coef["shape"]
    } else if ((dist=="weibull") || semi.flag) {
      init_mu[i]    <-  model_coef["scale"]
      init_sigma[i] <- -model_coef["shape"]
    } else if (dist=="gompertz") {
      init_mu[i]    <- model_coef["shape"]
      init_sigma[i] <- model_coef["rate"]
    }
  }

  # Subset of data for initial mu, sigma
  subset              <- (1:nrow(data)) %in% obj$set.stop
  dat                 <- data[subset, ]
  dat[, "init_mu"]    <- init_mu
  if (!semi.flag) dat[, "init_sigma"] <- init_sigma

  init_weights <- fs_getInitWeights(data, obj)

  # Get vars for mu
  form       <- try(as.formula(fs_getFormula("init_mu", muvars)))
  init_mu    <- coef(lm(form, data=dat, weights=init_weights))

  if (!semi.flag) {
    form       <- as.formula(fs_getFormula("init_sigma", sigvars))
    init_sigma <- coef(lm(form, data=dat, weights=init_weights))
  } else {
    init_sigma <- NULL
  }

  list(mu=init_mu, sigma=init_sigma)  
}

##################################################
# MLE functions
##################################################

fs_MLE <- function(data, obj, only.loglike=0, only.survival=0) {

  if (obj$semi.flag) {
    return(fs_MLE_semi(data, obj, only.loglike=only.loglike, only.survival=only.survival))
  }

  DEBUG <- obj$DEBUG
  if (DEBUG) cat("Begin: fs_MLE\n")

  prt           <- obj$print
  nint          <- obj$nint
  mle.rows0     <- obj$set.start
  init_cure     <- obj[["init_cure", exact=TRUE]]
  init_mu       <- obj$init_mu
  init_sigma    <- obj$init_sigma
  dist          <- obj$dist
  nr            <- nrow(data)
  died          <- data[, obj$died, drop=TRUE]
  exp_int       <- data[, obj$exp_int, drop=TRUE]
  alive         <- data[, obj$alive, drop=TRUE]
  lost_fu       <- data[, obj$lost_fu, drop=TRUE]
  lnorm.flag    <- dist == "lnorm"
  llogis.flag   <- dist == "llogis"
  weibull.flag  <- dist == "weibull"
  gompertz.flag <- dist == "gompertz"          
  ncure         <- length(init_cure)
  nmu           <- length(init_mu)
  nsigma        <- length(init_sigma)
  nms.cure      <- names(init_cure)
  nms.mu        <- names(init_mu)
  nms.sigma     <- names(init_sigma)
  ivec          <- data[, obj$time, drop=TRUE]
  time          <- ivec
  VEC           <- alive - lost_fu/2 - died
  fix.cure      <- obj[["FIX.CURE", exact=TRUE]]

  if (dist %in% c("lnorm", "llogis", "weibull")) ivec <- log(ivec)
  died.pos  <- died > 0
  diedFlag  <- any(died.pos)
  died.0    <- died == 0
  died0Flag <- any(died.0)
  VEC.pos   <- VEC > 0
  VECFlag   <- any(VEC.pos)
  VEC.0     <- VEC == 0
  VEC0Flag  <- any(VEC.0)

  MINLOGARG <- 1e-300
  BADRETURN <- 1e300

  fs_nLL <- function(cure=rep(0, ncure), mu=rep(0, nmu), 
                     sigma=rep(0, nsigma)) {

    temp     <- fs_nLL_getProb(data, cure, nms.cure, fix.cure=fix.cure)
    muvec    <- fs_coefMatSum(data, mu, nms.mu)
    sigmavec <- fs_coefMatSum(data, sigma, nms.sigma)
    
    if (lnorm.flag) {
      s <- temp + (1-temp)*(1 - pnorm((ivec-muvec)/exp(sigmavec)))
    } else if (llogis.flag) {
      s <- temp + (1-temp)/(1+exp((ivec-muvec)/exp(sigmavec)))
    } else if (weibull.flag) {
      s <- temp + (1-temp)*exp(-exp((ivec-muvec)/exp(sigmavec)))
    } else if (gompertz.flag) {
      s <- temp + (1-temp)*exp((1-exp(ivec*muvec))*exp(sigmavec)/muvec)
    }  

    p <- fs_setVecRows(s, time) 

    # Check p
    tmp.p0 <- !is.finite(p)
    if (any(tmp.p0)) p[tmp.p0]  <- 0
    tmp.p1 <- p > 1
    if (any(tmp.p1)) stop("ERROR: p > 1")

    if (only.survival) return(list(s=s, p=p))

    arg  <- 1 - p*exp_int
    tmp1 <- diedFlag && any(died.pos & (arg <= 0))
    tmp2 <- VECFlag && any(VEC.pos & tmp.p0)
    if (tmp1 || tmp2) return(BADRETURN)

    if (died0Flag) arg[died.0] <- 1 # log(1) = 0
    if (VEC0Flag) p[VEC.0] <- 1 # log(1) = 0
    arg2 <- died*log(arg) + VEC*log(p)

    ret  <- -sum(arg2)

    ret
  }
  fs_nLL_fix_cure <- function(mu=rep(0, nmu), sigma=rep(0, nsigma)) {
    fs_nLL(cure=0, mu=mu, sigma=sigma) 
  }

  if (only.survival) return(fs_nLL(cure=init_cure, mu=init_mu, sigma=init_sigma))
  if (only.loglike) {
    ll0 <- -fs_nLL(cure=init_cure, mu=init_mu, sigma=init_sigma)
    return(ll0)
  }

  if (!length(fix.cure)) {
    init <- list(cure=init_cure, mu=init_mu, sigma=init_sigma)
    fit  <- mle(fs_nLL, start=init, control=obj$control)
  } else {
    init <- list(mu=init_mu, sigma=init_sigma)
    fit  <- mle(fs_nLL_fix_cure, start=init, control=obj$control)
  }

  if (DEBUG) cat("End: fs_MLE\n")
  fit
}

fs_MLE_semi <- function(data, obj, only.loglike=0, only.survival=0) {

  DEBUG <- obj$DEBUG
  if (DEBUG) cat("Begin: fs_MLE_semi\n")

  prt           <- obj$print
  nint          <- obj$nint
  nsets         <- obj$nsets
  mle.rows0     <- obj$set.start
  init_cure     <- obj[["init_cure", exact=TRUE]]
  init_mu       <- obj$init_mu
  init_alpha    <- obj$init_alpha   # Length # of intervals - 1
  alpha.rows    <- obj$alpha.rows
  nr            <- nrow(data)
  died          <- data[, obj$died, drop=TRUE]
  exp_int       <- data[, obj$exp_int, drop=TRUE]
  alive         <- data[, obj$alive, drop=TRUE]
  lost_fu       <- data[, obj$lost_fu, drop=TRUE]      
  ncure         <- length(init_cure)
  nmu           <- length(init_mu)
  nalpha        <- length(init_alpha)
  nms.cure      <- names(init_cure)
  nms.mu        <- names(init_mu)
  time          <- data[, obj$time, drop=TRUE]
  VEC           <- alive - lost_fu/2 - died
  died.pos      <- died > 0
  diedFlag      <- any(died.pos)
  died.0        <- died == 0
  died0Flag     <- any(died.0)
  VEC.pos       <- VEC > 0
  VECFlag       <- any(VEC.pos)
  VEC.0         <- VEC == 0
  VEC0Flag      <- any(VEC.0)
  fix.cure      <- obj[["FIX.CURE", exact=TRUE]]

  MINLOGARG     <- 1e-300
  BADRETURN     <- 1e300

  fs_nLL_semi <- function(cure=rep(0, ncure), mu=rep(0, nmu), 
                     alpha=rep(0, nalpha)) {

    if (ncure) {
      temp   <- fs_nLL_getProb(data, cure, nms.cure, fix.cure=fix.cure)
    } else {
      temp   <- 0
    }
    muvec    <- fs_coefMatSum(data, mu, nms.mu)
    #alphavec <- rep(log(cumsum(exp(alpha))), nsets) 
    # For alphavec, since alpha is for intervals 2, ..., nint, add in 0 to alpha
    if (nalpha) {
      alpha    <- c(0, alpha)
      alphavec <- log(cumsum(exp(alpha)))[alpha.rows]
    } else {
      alphavec <- 0 
    }

    s <- temp + (1-temp)*exp(-exp(alphavec-muvec))

    p <- fs_setVecRows(s, time)

    # Check p
    tmp.p0 <- !is.finite(p)
    if (any(tmp.p0)) p[tmp.p0]  <- 0
    tmp.p1 <- p > 1
    if (any(tmp.p1)) stop("ERROR: p > 1")

    if (only.survival) return(list(s=s, p=p))

    arg  <- 1 - p*exp_int
    tmp1 <- diedFlag && any(died.pos & (arg <= 0))
    tmp2 <- VECFlag && any(VEC.pos & tmp.p0)

    if (tmp1 || tmp2) return(BADRETURN)

    if (died0Flag) arg[died.0] <- 1 # log(1) = 0
    if (VEC0Flag) p[VEC.0] <- 1 # log(1) = 0
    arg2 <- died*log(arg) + VEC*log(p)
    ret  <- -sum(arg2)

    ret
  }
  fs_nLL_semi_fix_cure <- function(mu=rep(0, nmu), alpha=rep(0, nalpha)) {
    fs_nLL_semi(cure=0, mu=mu, alpha=alpha)
  }

  if (only.survival) return(fs_nLL_semi(cure=init_cure, mu=init_mu, alpha=init_alpha))
  if (only.loglike) {
    ll0 <- -fs_nLL_semi(cure=init_cure, mu=init_mu, alpha=init_alpha)
    if (DEBUG) cat("End: fs_MLE_semi\n")
    return(ll0)
  }

  if (!length(fix.cure)) {
    init <- list(cure=init_cure, mu=init_mu, alpha=init_alpha)
    fit  <- mle(fs_nLL_semi, start=init, control=obj$control)
  } else {
    init <- list(mu=init_mu, alpha=init_alpha)
    fit  <- mle(fs_nLL_semi_fix_cure, start=init, control=obj$control)
  }

  if (DEBUG) cat("End: fs_MLE_semi\n")
  fit
}

fs_nLL_getProb <- function(data, parmvec, nms, fix.cure=NULL) {

  if (length(parmvec)) {
    if (is.null(fix.cure)) { 
      vec <- -fs_coefMatSum(data, parmvec, nms)
      ret <- 1/(1 + exp(vec))
    } else  {
      ret <- fix.cure
    }
  } else {
    ret <- 0
  }
  ret
}

fs_coefMatSum <- function(data, coef, nms) {

  # Order of coef must be same as nms

  nr   <- nrow(data)
  nc   <- length(coef)
  mat  <- as.matrix(data[, nms, drop=FALSE])
  cmat <- matrix(data=rep(coef, each=nr), nrow=nr, ncol=nc, byrow=FALSE)
  mat  <- cmat*mat
  ret  <- rowSums(mat)
  ret
}

fs_getLoglike <- function(data, obj) {

  fs_MLE(data, obj, only.loglike=1)

}
##########################################################################

fs_printRetObj <- function(x) {

  flist <- x$fit.list
  n     <- length(flist)
  for (i in 1:n) {
    print(flist[[i]]$fit)
  }
  invisible(NULL)
}

###########################################################################
### Code for plots
###########################################################################
getActuarialSurv <- function(alive, died, loss, exp_surv_int) {

  eff   <- alive - 0.5*loss
  vec   <- (1/exp_surv_int)*(eff - died)/eff
  ret   <- cumprod(vec)

  ret
}

getEstFromFinal <- function(est.tab, which) {

  # est.tab is fitlist$estimates (2 column object with rownames)
  # which is "cure", "mu", "sigma", "alpha"

  rnms <- rownames(est.tab)
  str  <- paste0(which, ".")
  len  <- nchar(str)
  tmp  <- substr(rnms, 1, len) == str
  nms  <- rnms[tmp]
  ret  <- est.tab[tmp, 1, drop=TRUE]

  # Remove prefix in nms
  nms <- substr(nms, len+1, 9999)

  names(ret) <- nms

  ret
} 

setInitEstFromFinalEst <- function(est.tab, obj) {

  # est.tab is fitlist$estimates (2 column object with rownames)
  if (obj$est_cure) obj$init_cure <- getEstFromFinal(est.tab, "cure")
  obj$init_mu    <- getEstFromFinal(est.tab, "mu")
  obj$init_sigma <- getEstFromFinal(est.tab, "sigma")
  if (obj$semi.flag) obj$init_alpha <- getEstFromFinal(est.tab, "alpha")

  obj
}

getEstActSurvTable <- function(fit) {

  fitlist <- fit$fitlist
  obj     <- fit$obj
  est.tab <- fitlist$estimates
  data    <- fit$data

  # New column names in data
  actv         <- ".Surv.Act"
  estv         <- ".Surv.Est"
  pv           <- ".Surv.P"
  obj$surv.act <- actv
  obj$surv.est <- estv
  obj$surv.p   <- pv

  # Set initial estimates to the final estimates
  obj2 <- setInitEstFromFinalEst(est.tab, obj) 
  
  # Get the estimated survival for all observations
  tmp          <- fs_MLE(data, obj2, only.loglike=0, only.survival=1)
  data[, estv] <- tmp$s
  data[, pv]   <- tmp$p

  # Compute cumulative survival
  start    <- obj$set.start
  end      <- obj$set.stop
  surv.act <- rep(NA, nrow(data))
  surv.est <- surv.act
  died     <- data[, obj$died, drop=TRUE]
  alive    <- data[, obj$alive, drop=TRUE]
  lost_fu  <- data[, obj$lost_fu, drop=TRUE]      
  exp_int  <- data[, obj$exp_int, drop=TRUE]

  for (i in 1:length(start)) {
    vec           <- start[i]:end[i]
    tmp           <- getActuarialSurv(alive[vec], died[vec], lost_fu[vec], exp_int[vec])
    surv.act[vec] <- tmp
  }
  data[, actv] <- surv.act

  list(data=data, obj=obj)
}

getDevianceResiduals <- function(fit) {

  # This function must be called after getEstActSurvTable
  fitlist <- fit$fitlist
  obj     <- fit$obj
  data    <- fit$data
  start   <- obj$set.start
  end     <- obj$set.stop
  died    <- data[, obj$died, drop=TRUE]
  alive   <- data[, obj$alive, drop=TRUE]
  lost_fu <- data[, obj$lost_fu, drop=TRUE]   
  exp_int <- data[, obj$exp_int, drop=TRUE]  
  exp.S   <- data[, obj$surv.p, drop=TRUE]
  nr      <- nrow(data)
 
  # Observed number of survivors
  eff.n <- alive - 0.5*lost_fu
  obs.n <- eff.n - died

  # Compute P-hat
  Pvec <- exp.S*exp_int

  # Predicted number of survivors
  pred.n <- eff.n*Pvec

  # Deviance residuals
  vec   <- obs.n*log(obs.n/pred.n) + died*log(died/(eff.n-pred.n))
  tmp   <- Pvec <= 0
  if (any(tmp)) {
    v2       <- died*log(died/eff.n) 
    vec[tmp] <- v2[tmp]
  }
  tmp   <- Pvec >= 1
  if (any(tmp)) {
    v2       <- obs.n*log(obs.n/eff.n)
    vec[tmp] <- v2[tmp]
  }

  resid <- sign(pred.n - obs.n)*sqrt(2)*sqrt(vec)

  v             <- ".Dev.Resid"
  data[, v]     <- resid
  obj$dev.resid <- v
  
  list(data=data, obj=obj)
}

getIdStrFromVars <- function(data, vars, sep="_") {

  nvars <- length(vars)
  if (!nvars) return(rep("0", nrow(data)))

  ret   <- trimws(data[, vars[1], drop=TRUE]) 
  if (nvars > 1) {
    for (i in 2:nvars) {
      tmp <- trimws(data[, vars[i], drop=TRUE]) 
      ret <- paste0(ret, sep, tmp)
    }
  }

  ret
}

getCureFrac <- function(data, parms) {

  vars <- names(parms)
  
  # Check to see if all vars are in data
  tmp  <- vars %in% colnames(data)
  vars <- vars[tmp]
  if (!length(tmp)) stop("ERROR: variables missing in data")

  parms      <- parms[vars]
  dim(parms) <- c(length(parms), 1)
  mat        <- as.matrix(data[, vars, drop=FALSE])
  ret        <- 1/(1 + exp(-(mat %*% parms)))  

  ret
}

# Function to compute cure fractions
getCureFractions <- function(fit) {

  fitlist   <- fit$fitlist
  obj       <- fit$obj
  data      <- fit$data
  new       <- ".Cure.Fraction"
  obj$cure.fraction <- new

  # Get the cure estimated parms, prefix "cure." is removed
  cure <- getEstFromFinal(fitlist$estimates, "cure")
  
  # Get cure fraction for each observation
  data[, new] <- getCureFrac(data, cure)
  
  list(data=data, obj=obj)
}

getPlotData <- function(fitlist) {

  # Get survival estimates for plots
  tmp <- try(getEstActSurvTable(fitlist), silent=TRUE)
  if (!inherits(tmp, "try-error")) {
    fitlist$data <- tmp$data
    fitlist$obj  <- tmp$obj
  }

  # Deviance residuals
  tmp <- try(getDevianceResiduals(fitlist), silent=TRUE)
  if (!inherits(tmp, "try-error")) {
    fitlist$data <- tmp$data
    fitlist$obj  <- tmp$obj
  } 

  tmp <- try(getCureFractions(fitlist), silent=TRUE)
  if (!inherits(tmp, "try-error")) {
    fitlist$data <- tmp$data
    fitlist$obj  <- tmp$obj
  }

  fitlist
}

getProfileLoglike <- function(fit, lower=0, upper=1, step=0.1) {

  # The object FIX.CURE will be used as the fixed value in MLE function

  fs_check_list(fit, "fit", must.inc=c("fitlist", "data", "obj")) 
  fitlist <- fit$fitlist
  data    <- fit$data
  obj     <- fit$obj
  upper   <- fs_check_num(upper, "upper", 1,   pos=0, nonneg=1, maxeq=1,     maxlt=NULL)
  lower   <- fs_check_num(lower, "lower", 0,   pos=0, nonneg=1, maxeq=upper, maxlt=NULL)
  step    <- fs_check_num(step,  "step",  0.1, pos=0, nonneg=1, maxeq=1,     maxlt=NULL)

  # Only compute if cure consists of intercept
  if (!obj$est_cure) return(NULL)
  if (length(obj[["cure", exact=TRUE]])) return(NULL)

  curevec <- seq(lower, upper, step)
  ncure   <- length(curevec)
  ret     <- rep(NA, ncure)

  # Use the final estimates as initial estimates
  obj2 <- setInitEstFromFinalEst(fitlist$estimates, obj)

  for (i in 1:ncure) {
    obj2$FIX.CURE <- curevec[i]
    
    # Get MLEs
    fit2 <- try(fs_MLE(data, obj2), silent=TRUE)

    # Check the fit and rerun if necessary
    fitlist2 <- fs_checkFitAndRerun(fit2, data, obj2)
    if (fitlist2$converged) ret[i] <- fitlist2$loglike
  }

  ret <- cbind(curevec, ret)
  colnames(ret) <- c("CureFraction", "Loglike")
  ret
}

