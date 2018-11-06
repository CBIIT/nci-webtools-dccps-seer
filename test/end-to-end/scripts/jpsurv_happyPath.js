
const assert = require('assert')
const path = require('path')
const test = require('selenium-webdriver/testing')
const webdriver = require('selenium-webdriver')

By = webdriver.By
until = webdriver.until

describe('Test Suite 1 - ' + path.basename(__filename), function() {

  test.before(function(){

    // do something before test suite execution
    // no matter if there are failed cases

  });

  test.after(function(){

    // do something after test suite execution is finished
    // no matter if there are failed cases

  });

  test.beforeEach(function(){

    // do something before test case execution
    // no matter if there are failed cases

  });

  test.afterEach(function(){

    // do something after test case execution is finished
    // no matter if there are failed cases

  });

  test.it('jpsurv_HappyPath', function(done) {
    this.timeout(0);
    var driver = new webdriver.Builder()
    .forBrowser('firefox')
    .build();

    driver.get("https://analysistools-dev.nci.nih.gov" + "/jpsurv/");

    var filename1 = __dirname + "/../data/SEER9_Survival_6CancerSitesByStage_1975_2007.dic"
    var filename2 = __dirname + "/../data/SEER9_Survival_6CancerSitesByStage_1975_2007.txt"


	var uploadFileElement = driver.findElement(By.id('file_control'))
	uploadFileElement.sendKeys(filename1)
	uploadFileElement.sendKeys(filename2)
	driver.findElement(By.id(`upload_file_submit`)).click();
	driver.findElement(By.id(`calculate`)).click();

	let errorMessage = "There was an error and the results were not not displayed."
	var elementTested = driver.findElement(By.id('right_panel'))
    driver.wait( until.elementIsVisible(elementTested), 10000, errorMessage)

    done()
    driver.close();
  });

})
