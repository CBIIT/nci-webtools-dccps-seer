import os
import sys
import json
import RequestProcessor
from stompest.config import StompConfig
from stompest.sync import Stomp
#def buildFailure(message):
#    response = jsonify(message=message, success=False)
#    response.mimetype = 'application/json'
#    response.status_code = 400
#    return response
    
#def buildSuccess(message):
#    response = jsonify(message=message, success=True)
#    response.mimetype = 'application/json'
#    response.status_code = 200
#    return response

def sendqueue(jpsurvDataString):
#    try:
    CONFIG = StompConfig('tcp://ncias-d1207-v.nci.nih.gov:61613')
    client = Stomp(CONFIG)
    client.connect()
    client.send(QUEUE,json.dumps({"filepath":UPLOAD_DIR,"data":jpsurvDataString,"timestamp":"2015-06-25"}))
    client.disconnect()
#    return buildSuccess("The request has been received. An email will be sent when the calculation has completed.")
#    except Exception as e:
#       return buildFailure(str(e))
    
def main():
    jpsurvDataString='{"file":{"dictionary":"Breast_RelativeSurvival.dic","data":"Breast_RelativeSurvival.txt","form":"form-506827.json"},"calculate":{"form":{"yearOfDiagnosisRange":[2000,2011],"cohortVars":["Age groups","Breast stage"],"cohortValues":["\"00-49\"","\"Localized\""],"covariateVars":"","maxjoinPoints":0},"static":{"yearOfDiagnosisTitle":"Year of diagnosis 1975+","years":["1975","1976","1977","1978","1979","1980","1981","1982","1983","1984","1985","1986","1987","1988","1989","1990","1991","1992","1993","1994","1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011"],"yearOfDiagnosisVarName":"Year_of_diagnosis_1975","seerFilePrefix":"Breast_RelativeSurvival","allVars":["Age groups","Breast stage","Year_of_diagnosis_1975"],"advanced":{"advDeleteInterval":"F","advBetween":"2","advFirst":"3","advLast":"4","advYear":"10"}}},"plot":{"form":{},"static":{"imageId":0}},"additional":{"headerJoinPoints":0,"yearOfDiagnosis":null,"intervals":[1,4]},"tokenId":"506827","status":"uploaded","stage2completed":0,"queue":{"email":"scott.goldweber@nih.com","url":"http://analysistools-sandbox.nci.nih.gov/jpsurv/?file_control_filename=Breast_RelativeSurvival.dic&file_data_filename=Breast_RelativeSurvival.txt&output_filename=form-506827.json&status=uploaded&tokenId=506827"}}'
    sendqueue(jpsurvDataString)

if __name__ == '__main__':
    UPLOAD_DIR = os.path.join(os.getcwd(), 'tmp')
    QUEUE = '/queue/jpsurv'
    sys.exit(main())
