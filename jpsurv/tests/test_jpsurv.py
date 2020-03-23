import unittest
import os

os.chdir("../")
from jpsurv import app


class BasicTests(unittest.TestCase):
    def setUp(self):
        # creates a test client
        self.app = app.test_client()

    def tearDown(self):
        pass

    def test_1_ping(self):
        # sends HTTP GET request to the application
        # on the specified path
        result = self.app.get("/ping")

        # assert the status code of the response
        self.assertEqual(result.status_code, 200)

    def test_2_home(self):
        result = self.app.get("/index.html")
        assert result.status_code == 200

    def test_3_upload_dic(self):
        txt = open("./data/Rocky.txt", "rb")
        dic = open("./data/Rocky.dic", "rb")
        data = {"file_control": [(txt, "Rocky.txt"), (dic, "Rocky.dic")]}
        res = self.app.post(
            "/jpsurvRest/stage1_upload?tokenId=111111&input_type=dic",
            data=data,
            follow_redirects=False,
        )
        txt.close()
        dic.close()
        assert res.status_code == 302, "Rocky Failed"
        assert (
            res.location
            == "http://localhost/?request=false&file_control_filename=Rocky.dic&file_data_filename=Rocky.txt&output_filename=form-111111.json&status=uploaded&tokenId=111111"
        )

        txt = open("./data/SEER9_Survival_6CancerSitesByStage_1975_2007.txt", "rb")
        dic = open("./data/SEER9_Survival_6CancerSitesByStage_1975_2007.dic", "rb")
        data = {
            "file_control": [
                (txt, "SEER9_Survival_6CancerSitesByStage_1975_2007.txt"),
                (dic, "SEER9_Survival_6CancerSitesByStage_1975_2007.dic"),
            ]
        }
        res = self.app.post(
            "/jpsurvRest/stage1_upload?tokenId=222222&input_type=dic",
            data=data,
            follow_redirects=False,
        )
        txt.close()
        dic.close()
        assert res.status_code == 302, "SEER9 Failed"
        assert (
            res.location
            == "http://localhost/?request=false&file_control_filename=SEER9_Survival_6CancerSitesByStage_1975_2007.dic&file_data_filename=SEER9_Survival_6CancerSitesByStage_1975_2007.txt&output_filename=form-222222.json&status=uploaded&tokenId=222222"
        )

        txt = open("./data/75surv_jpsurv_example_CTPR.txt", "rb")
        dic = open("./data/75surv_jpsurv_example_CTPR.dic", "rb")
        data = {
            "file_control": [
                (txt, "75surv_jpsurv_example_CTPR.txt"),
                (dic, "75surv_jpsurv_example_CTPR.dic"),
            ]
        }
        res = self.app.post(
            "/jpsurvRest/stage1_upload?tokenId=333333&input_type=dic",
            data=data,
            follow_redirects=False,
        )
        txt.close()
        dic.close()
        assert res.status_code == 302, "75surv Failed"
        assert (
            res.location
            == "http://localhost/?request=false&file_control_filename=75surv_jpsurv_example_CTPR.dic&file_data_filename=75surv_jpsurv_example_CTPR.txt&output_filename=form-333333.json&status=uploaded&tokenId=333333"
        )

        csv = open("./data/Breast_RelativeSurvival_Head_NA0.csv", "rb")
        data = {"file_control_csv": [(csv, "Breast_RelativeSurvival_Head_NA0.csv")]}
        res = self.app.post(
            "/jpsurvRest/stage1_upload?tokenId=444444&input_type=csv&map={%22file%22:{%22dictionary%22:%22Breast.dic%22,%22data%22:%22something.txt%22,%22form%22:%22form-983832.json%22},%22calculate%22:{%22form%22:{%22yearOfDiagnosisRange%22:[],%22interval%22:null},%22static%22:{}},%22plot%22:{%22form%22:{},%22static%22:{%22imageId%22:-1}},%22additional%22:{%22headerJoinPoints%22:0,%22yearOfDiagnosis%22:null,%22intervals%22:[5,10],%22absTmp%22:[null,null],%22absChgRange%22:null,%22del%22:%22,%22,%22rates%22:%22Percents%22,%22statistic%22:%22Relative%20Survival%22},%22tokenId%22:%22444444%22,%22status%22:%22unknown%22,%22stage2completed%22:0,%22mapping%22:{%22cohorts%22:[2,3],%22year%22:4,%22interval%22:5,%22alive_at_start%22:6,%22died%22:7,%22lost_to_followup%22:8,%22obsSEInt%22:11,%22exp_int%22:11,%22survInt%22:13,%22observed%22:14,%22survIntSE%22:17,%22survCumSE%22:18,%22has_headers%22:%22true%22},%22input_type%22:%22csv%22,%22passed%22:true}&has_headers=true&headers=page_type,age_rec,stage,Year_of_Diagnosis,Interval,Alive_at_Start,Died,Lost_to_Followup,obs_int,obs_cum,Expected_Survival_Interval,exp_cum,Relative_Survival_Interval,Relative_Survival_Cum,se_obs_int,se_obs_cum,Relative_SE_Interval,Relative_SE_Cum",
            data=data,
            follow_redirects=False,
        )
        csv.close()
        assert res.status_code == 302, "Breast Failed"
        assert (
            res.location
            == "http://localhost/?request=false&file_control_filename=Breast_RelativeSurvival_Head_NA0.csv&output_filename=form-444444.json&status=uploaded&tokenId=444444"
        )

    def test_4_calculate(self):
        res = self.app.get(
            "/jpsurvRest/stage2_calculate?jpsurvData=%7B%22file%22%3A%7B%22dictionary%22%3A%22Rocky.dic%22%2C%22data%22%3A%22Rocky.txt%22%2C%22form%22%3A%22form-111111.json%22%7D%2C%22calculate%22%3A%7B%22form%22%3A%7B%22yearOfDiagnosisRange%22%3A%5B1975%2C2014%5D%2C%22interval%22%3A15%2C%22cohortVars%22%3A%5B%22Site%20Jpsurv_v2%22%5D%2C%22AllcohortValues%22%3A%7B%220%22%3A%5B%22%5C%22Liver%20and%20Intrahepatic%20Bile%20Duct%5C%22%22%2C%22%5C%22Lung%20and%20Bronchus%5C%22%22%2C%22%5C%22Breast_female%5C%22%22%2C%22%5C%22Non-Hodgkin%20Lymphoma%5C%22%22%2C%22%5C%22Chronic%20Myeloid%20Leukemia%5C%22%22%2C%22%5C%22Kidney%20and%20Renal%20Pelvis%5C%22%22%5D%7D%2C%22cohortValues%22%3A%5B%22%5C%22Liver%20and%20Intrahepatic%20Bile%20Duct%5C%22%22%5D%2C%22covariateVars%22%3A%22%22%2C%22maxjoinPoints%22%3A0%7D%2C%22static%22%3A%7B%22yearOfDiagnosisTitle%22%3A%22Year%20of%20diagnosis%20jpsurv%22%2C%22years%22%3A%5B%221975%22%2C%221976%22%2C%221977%22%2C%221978%22%2C%221979%22%2C%221980%22%2C%221981%22%2C%221982%22%2C%221983%22%2C%221984%22%2C%221985%22%2C%221986%22%2C%221987%22%2C%221988%22%2C%221989%22%2C%221990%22%2C%221991%22%2C%221992%22%2C%221993%22%2C%221994%22%2C%221995%22%2C%221996%22%2C%221997%22%2C%221998%22%2C%221999%22%2C%222000%22%2C%222001%22%2C%222002%22%2C%222003%22%2C%222004%22%2C%222005%22%2C%222006%22%2C%222007%22%2C%222008%22%2C%222009%22%2C%222010%22%2C%222011%22%2C%222012%22%2C%222013%22%2C%222014%22%5D%2C%22yearOfDiagnosisVarName%22%3A%22Year_of_diagnosis_jpsurv%22%2C%22seerFilePrefix%22%3A%22Rocky%22%2C%22allVars%22%3A%5B%22Site%20Jpsurv_v2%22%2C%22Year_of_diagnosis_jpsurv%22%5D%2C%22advanced%22%3A%7B%22advDeleteInterval%22%3A%22F%22%2C%22advBetween%22%3A%222%22%2C%22advFirst%22%3A%223%22%2C%22advLast%22%3A%225%22%2C%22advYear%22%3A%225%22%7D%7D%7D%2C%22plot%22%3A%7B%22form%22%3A%7B%7D%2C%22static%22%3A%7B%22imageId%22%3A0%7D%7D%2C%22additional%22%3A%7B%22headerJoinPoints%22%3A0%2C%22yearOfDiagnosis%22%3A%5B%221975%22%5D%2C%22intervals%22%3A%5B5%2C10%5D%2C%22absTmp%22%3A%5Bnull%2Cnull%5D%2C%22absChgRange%22%3Anull%2C%22input_type%22%3A%22dic%22%2C%22statistic%22%3A%22Relative%20Survival%22%2C%22DataTypeVariable%22%3A%22Relative_Survival_Cum%22%2C%22yearOfDiagnosis_default%22%3A%5B1975%5D%2C%22use_default%22%3A%22true%22%2C%22intervals_default%22%3A%5B5%2C10%5D%2C%22intervalsDeath%22%3A%5B5%2C10%5D%2C%22yearTrend%22%3A0%2C%22deathTrend%22%3A0%7D%2C%22tokenId%22%3A%22111111%22%2C%22status%22%3A%22uploaded%22%2C%22stage2completed%22%3Afalse%2C%22mapping%22%3A%7B%7D%2C%22session_tokenId%22%3A%22111111%22%2C%22queue%22%3A%7B%22email%22%3A%22%22%2C%22url%22%3A%22http%253A%252F%252Flocalhost%253A9001%252F%253Frequest%253Dfalse%2526file_control_filename%253DRocky.dic%2526file_data_filename%253DRocky.txt%2526output_filename%253Dform-111111.json%2526status%253Duploaded%2526tokenId%253D111111%2526request%253Dtrue%22%7D%2C%22run%22%3A1%2C%22recentTrends%22%3A0%2C%22results%22%3A%7B%7D%7D&_=1585060469327"
        )
        assert res.status_code == 200, "Rocky Failed"
        res = self.app.get("/tmp/results-111111-1-0.json")
        assert res.status_code == 200, "Rocky Failed"

        res = self.app.get(
            "/jpsurvRest/stage2_calculate?jpsurvData=%7B%22file%22%3A%7B%22dictionary%22%3A%22SEER9_Survival_6CancerSitesByStage_1975_2007.dic%22%2C%22data%22%3A%22SEER9_Survival_6CancerSitesByStage_1975_2007.txt%22%2C%22form%22%3A%22form-222222.json%22%7D%2C%22calculate%22%3A%7B%22form%22%3A%7B%22yearOfDiagnosisRange%22%3A%5B1975%2C2007%5D%2C%22interval%22%3A34%2C%22cohortVars%22%3A%5B%22Sites%3A%20CR%20LB%20B%20O%20P%20T%22%2C%22Sex%20Male%20or%20Female%22%2C%22SEER%20historic%20stage%20A%20(All%2Floc%2Freg%2Fdist)%22%5D%2C%22AllcohortValues%22%3A%7B%220%22%3A%5B%22%5C%22Colon%20and%20Rectum%5C%22%22%2C%22%5C%22Lung%20and%20Bronchus%5C%22%22%2C%22%5C%22Breast%5C%22%22%5D%2C%221%22%3A%5B%22%5C%22Male%5C%22%22%2C%22%5C%22Female%5C%22%22%5D%2C%222%22%3A%5B%22%5C%22All%20stages%5C%22%22%2C%22%5C%22Localized%5C%22%22%2C%22%5C%22Regional%5C%22%22%2C%22%5C%22Distant%5C%22%22%5D%7D%2C%22cohortValues%22%3A%5B%22%5C%22Colon%20and%20Rectum%5C%22%22%2C%22%5C%22Male%5C%22%22%2C%22%5C%22All%20stages%5C%22%22%5D%2C%22covariateVars%22%3A%22%22%2C%22maxjoinPoints%22%3A0%7D%2C%22static%22%3A%7B%22yearOfDiagnosisTitle%22%3A%22Year%20of%20diagnosis%20(75-07%20individual)%22%2C%22years%22%3A%5B%221975%22%2C%221976%22%2C%221977%22%2C%221978%22%2C%221979%22%2C%221980%22%2C%221981%22%2C%221982%22%2C%221983%22%2C%221984%22%2C%221985%22%2C%221986%22%2C%221987%22%2C%221988%22%2C%221989%22%2C%221990%22%2C%221991%22%2C%221992%22%2C%221993%22%2C%221994%22%2C%221995%22%2C%221996%22%2C%221997%22%2C%221998%22%2C%221999%22%2C%222000%22%2C%222001%22%2C%222002%22%2C%222003%22%2C%222004%22%2C%222005%22%2C%222006%22%2C%222007%22%5D%2C%22yearOfDiagnosisVarName%22%3A%22Year_of_diagnosis_(75-07_individual)%22%2C%22seerFilePrefix%22%3A%22SEER9_Survival_6CancerSitesByStage_1975_2007%22%2C%22allVars%22%3A%5B%22Sites%3A%20CR%20LB%20B%20O%20P%20T%22%2C%22Sex%20Male%20or%20Female%22%2C%22SEER%20historic%20stage%20A%20(All%2Floc%2Freg%2Fdist)%22%2C%22Year_of_diagnosis_(75-07_individual)%22%5D%2C%22advanced%22%3A%7B%22advDeleteInterval%22%3A%22F%22%2C%22advBetween%22%3A%222%22%2C%22advFirst%22%3A%223%22%2C%22advLast%22%3A%225%22%2C%22advYear%22%3A%225%22%7D%7D%7D%2C%22plot%22%3A%7B%22form%22%3A%7B%7D%2C%22static%22%3A%7B%22imageId%22%3A0%7D%7D%2C%22additional%22%3A%7B%22headerJoinPoints%22%3A0%2C%22yearOfDiagnosis%22%3A%5B%221975%22%5D%2C%22intervals%22%3A%5B5%2C10%5D%2C%22absTmp%22%3A%5Bnull%2Cnull%5D%2C%22absChgRange%22%3Anull%2C%22input_type%22%3A%22dic%22%2C%22statistic%22%3A%22Relative%20Survival%22%2C%22DataTypeVariable%22%3A%22Relative_Survival_Cum%22%2C%22yearOfDiagnosis_default%22%3A%5B1975%5D%2C%22use_default%22%3A%22true%22%2C%22intervals_default%22%3A%5B5%2C10%5D%2C%22intervalsDeath%22%3A%5B5%2C10%5D%2C%22yearTrend%22%3A0%2C%22deathTrend%22%3A0%7D%2C%22tokenId%22%3A%22222222%22%2C%22status%22%3A%22uploaded%22%2C%22stage2completed%22%3Afalse%2C%22mapping%22%3A%7B%7D%2C%22session_tokenId%22%3A%22222222%22%2C%22queue%22%3A%7B%22email%22%3A%22%22%2C%22url%22%3A%22http%253A%252F%252Flocalhost%253A9001%252F%253Frequest%253Dfalse%2526file_control_filename%253DSEER9_Survival_6CancerSitesByStage_1975_2007.dic%2526file_data_filename%253DSEER9_Survival_6CancerSitesByStage_1975_2007.txt%2526output_filename%253Dform-222222.json%2526status%253Duploaded%2526tokenId%253D222222%2526request%253Dtrue%22%7D%2C%22run%22%3A1%2C%22recentTrends%22%3A0%2C%22results%22%3A%7B%7D%7D&_=1585060191858"
        )
        assert res.status_code == 200, "SEER9 Failed"
        res = self.app.get("/tmp/results-222222-1-0.json")
        assert res.status_code == 200, "SEER9 Failed"

        res = self.app.get(
            "/jpsurvRest/stage2_calculate?jpsurvData=%7B%22file%22%3A%7B%22dictionary%22%3A%2275surv_jpsurv_example_CTPR.dic%22%2C%22data%22%3A%2275surv_jpsurv_example_CTPR.txt%22%2C%22form%22%3A%22form-333333.json%22%7D%2C%22calculate%22%3A%7B%22form%22%3A%7B%22yearOfDiagnosisRange%22%3A%5B1975%2C2016%5D%2C%22interval%22%3A5%2C%22cohortVars%22%3A%5B%5D%2C%22AllcohortValues%22%3A%7B%7D%2C%22cohortValues%22%3A%5B%5D%2C%22covariateVars%22%3A%22%22%2C%22maxjoinPoints%22%3A0%7D%2C%22static%22%3A%7B%22yearOfDiagnosisTitle%22%3A%22Year%20of%20Dx%20(1975-2015%20single%20years)%22%2C%22years%22%3A%5B%221975%22%2C%221976%22%2C%221977%22%2C%221978%22%2C%221979%22%2C%221980%22%2C%221981%22%2C%221982%22%2C%221983%22%2C%221984%22%2C%221985%22%2C%221986%22%2C%221987%22%2C%221988%22%2C%221989%22%2C%221990%22%2C%221991%22%2C%221992%22%2C%221993%22%2C%221994%22%2C%221995%22%2C%221996%22%2C%221997%22%2C%221998%22%2C%221999%22%2C%222000%22%2C%222001%22%2C%222002%22%2C%222003%22%2C%222004%22%2C%222005%22%2C%222006%22%2C%222007%22%2C%222008%22%2C%222009%22%2C%222010%22%2C%222011%22%2C%222012%22%2C%222013%22%2C%222014%22%2C%222015%22%2C%222016%22%5D%2C%22yearOfDiagnosisVarName%22%3A%22Year_of_Dx_(1975-2015_single_years)%22%2C%22seerFilePrefix%22%3A%2275surv_jpsurv_example_CTPR%22%2C%22allVars%22%3A%5B%22Year_of_Dx_(1975-2015_single_years)%22%5D%2C%22advanced%22%3A%7B%22advDeleteInterval%22%3A%22F%22%2C%22advBetween%22%3A%222%22%2C%22advFirst%22%3A%223%22%2C%22advLast%22%3A%225%22%2C%22advYear%22%3A%225%22%7D%7D%7D%2C%22plot%22%3A%7B%22form%22%3A%7B%7D%2C%22static%22%3A%7B%22imageId%22%3A0%7D%7D%2C%22additional%22%3A%7B%22headerJoinPoints%22%3A0%2C%22yearOfDiagnosis%22%3A%5B%221975%22%5D%2C%22intervals%22%3A%5B5%5D%2C%22absTmp%22%3A%5Bnull%2Cnull%5D%2C%22absChgRange%22%3Anull%2C%22input_type%22%3A%22dic%22%2C%22statistic%22%3A%22Relative%20Survival%22%2C%22DataTypeVariable%22%3A%22Relative_Survival_Cum%22%2C%22yearOfDiagnosis_default%22%3A%5B1975%5D%2C%22use_default%22%3A%22true%22%2C%22intervals_default%22%3A%5B5%5D%2C%22intervalsDeath%22%3A%5B5%5D%2C%22yearTrend%22%3A0%2C%22deathTrend%22%3A0%7D%2C%22tokenId%22%3A%22333333%22%2C%22status%22%3A%22uploaded%22%2C%22stage2completed%22%3Afalse%2C%22mapping%22%3A%7B%7D%2C%22session_tokenId%22%3A%22333333%22%2C%22queue%22%3A%7B%22email%22%3A%22%22%2C%22url%22%3A%22http%253A%252F%252Flocalhost%253A9001%252F%253Frequest%253Dfalse%2526file_control_filename%253D75surv_jpsurv_example_CTPR.dic%2526file_data_filename%253D75surv_jpsurv_example_CTPR.txt%2526output_filename%253Dform-333333.json%2526status%253Duploaded%2526tokenId%253D333333%2526request%253Dtrue%22%7D%2C%22run%22%3A1%2C%22recentTrends%22%3A0%2C%22results%22%3A%7B%7D%7D&_=1584996915321"
        )
        assert res.status_code == 200, "75surv Failed"
        res = self.app.get("/tmp/results-333333-1-0.json")
        assert res.status_code == 200, "75surv Failed"

        res = self.app.get(
            "/jpsurvRest/stage2_calculate?jpsurvData=%7B%22file%22%3A%7B%22dictionary%22%3A%22Breast_RelativeSurvival_Head_NA0.csv%22%2C%22form%22%3A%22form-444444.json%22%7D%2C%22calculate%22%3A%7B%22form%22%3A%7B%22yearOfDiagnosisRange%22%3A%5B0%2C36%5D%2C%22interval%22%3A36%2C%22cohortVars%22%3A%5B%22age_rec%22%2C%22stage%22%5D%2C%22AllcohortValues%22%3A%7B%220%22%3A%5B%22%5C%220%5C%22%22%2C%22%5C%221%5C%22%22%2C%22%5C%222%5C%22%22%5D%2C%221%22%3A%5B%22%5C%220%5C%22%22%2C%22%5C%221%5C%22%22%2C%22%5C%222%5C%22%22%5D%7D%2C%22cohortValues%22%3A%5B%22%5C%220%5C%22%22%2C%22%5C%220%5C%22%22%5D%2C%22covariateVars%22%3A%22%22%2C%22maxjoinPoints%22%3A0%7D%2C%22static%22%3A%7B%22yearOfDiagnosisTitle%22%3A%22Year_of_Diagnosis%22%2C%22years%22%3A%5B0%2C1%2C2%2C3%2C4%2C5%2C6%2C7%2C8%2C9%2C10%2C11%2C12%2C13%2C14%2C15%2C16%2C17%2C18%2C19%2C20%2C21%2C22%2C23%2C24%2C25%2C26%2C27%2C28%2C29%2C30%2C31%2C32%2C33%2C34%2C35%2C36%5D%2C%22yearOfDiagnosisVarName%22%3A%22Year_of_Diagnosis%22%2C%22seerFilePrefix%22%3A%22Breast_RelativeSurvival_Head_NA0%22%2C%22allVars%22%3A%5B%22age_rec%22%2C%22stage%22%2C%22Year_of_Diagnosis%22%5D%2C%22advanced%22%3A%7B%22advDeleteInterval%22%3A%22F%22%2C%22advBetween%22%3A%222%22%2C%22advFirst%22%3A%223%22%2C%22advLast%22%3A%225%22%2C%22advYear%22%3A%225%22%7D%7D%7D%2C%22plot%22%3A%7B%22form%22%3A%7B%7D%2C%22static%22%3A%7B%22imageId%22%3A0%7D%7D%2C%22additional%22%3A%7B%22headerJoinPoints%22%3A0%2C%22yearOfDiagnosis%22%3A%5B%220%22%5D%2C%22intervals%22%3A%5B5%2C10%5D%2C%22absTmp%22%3A%5Bnull%2Cnull%5D%2C%22absChgRange%22%3Anull%2C%22input_type%22%3A%22csv%22%2C%22statistic%22%3A%22Relative%20Survival%22%2C%22has_headers%22%3Atrue%2C%22alive_at_start%22%3A6%2C%22died%22%3A7%2C%22lost_to_followup%22%3A8%2C%22exp_int%22%3A11%2C%22observed%22%3A14%2C%22interval%22%3A%225%22%2C%22DataTypeVariable%22%3A%22Relative_Survival_Cum%22%2C%22yearOfDiagnosis_default%22%3A%5B0%5D%2C%22use_default%22%3A%22true%22%2C%22del%22%3A%22%2C%22%2C%22intervals_default%22%3A%5B5%2C10%5D%2C%22intervalsDeath%22%3A%5B5%2C10%5D%2C%22yearTrend%22%3A0%2C%22deathTrend%22%3A0%7D%2C%22tokenId%22%3A%22444444%22%2C%22status%22%3A%22uploaded%22%2C%22stage2completed%22%3Afalse%2C%22mapping%22%3A%7B%7D%2C%22session_tokenId%22%3A%22444444%22%2C%22queue%22%3A%7B%22email%22%3A%22%22%2C%22url%22%3A%22http%253A%252F%252Flocalhost%253A9001%252F%253Frequest%253Dfalse%2526file_control_filename%253DBreast_RelativeSurvival_Head_NA0.csv%2526output_filename%253Dform-444444.json%2526status%253Duploaded%2526tokenId%253D444444%2526request%253Dtrue%22%7D%2C%22run%22%3A1%2C%22recentTrends%22%3A0%2C%22results%22%3A%7B%7D%7D&_=1585060724891"
        )
        assert res.status_code == 200, "Breast Failed"
        res = self.app.get("/tmp/results-444444-1-0.json")
        assert res.status_code == 200, "Breast Failed"


if __name__ == "__main__":
    unittest.main()
