#!/usr/bin/env python
from flask import Flask, render_template, Response, abort, request, make_response, url_for, jsonify, redirect, current_app
from functools import wraps
import rpy2.robjects as robjects
import os
import json
from werkzeug import secure_filename
import textwrap
import logging
import unicodedata
from stompest.config import StompConfig
from stompest.sync import Stomp
from PropertyUtil import PropertyUtil
import time

app = Flask(__name__, static_folder='', static_url_path='/')

def fix_jpsurv(jpsurvDataString):
    #Replace {plus} with +
    jpsurvDataString = jpsurvDataString.decode("utf-8").replace("{plus}", "+").encode("utf-8")
    #Replace \"\" with \"null\"
    #jpsurvDataString = jpsurvDataString.decode("utf-8").replace('\\"\\"', 'null').encode("utf-8")
    #jpsurvDataString = jpsurvDataString.decode("utf-8").replace('\\"\\"', '\\"NULL\\"').encode("utf-8")
    print BOLD+"New:::"+ENDC
    print jpsurvDataString

    return jpsurvDataString
def index():
    return render_template('index.html')

@app.route('/jpsurvRest/debug', methods = ['GET'])
def test():
    raise



@app.route('/jpsurvRest/parse', methods = ['GET'])
def parse():
    # python LDpair.py rs2720460 rs11733615 EUR 38
    mimetype = 'application/json'

    print
    print 'parse JPSURV'
    print 

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)
    info(BOLD+"**** jpsurvDataString ****"+ENDC)
    print type(jpsurvDataString)
    info(jpsurvDataString)
    debug(OKGREEN+"The jpsurv STRING::::::"+ENDC)
    debug(jpsurvDataString)
    jpsurvData = json.loads(jpsurvDataString)
    print type(jpsurvData)
    out_json = json.dumps(jpsurvData)

    return current_app.response_class(out_json, mimetype=mimetype)

@app.route('/jpsurvRest/status', methods = ['GET'])
def status():
    # python LDpair.py rs2720460 rs11733615 EUR 38
    debug(OKGREEN+"Calling status::::::"+ENDC)
    
    mimetype = 'application/json'
    debug("")
    debug('Execute jpsurvRest/status status:OK')
    status = [{"status":"OK"}]
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)

@app.route('/jpsurvRest/get_form', methods = ['GET'])
def get_upload():
    # python LDpair.py rs2720460 rs11733615 EUR 38
    mimetype = 'application/json'

    print
    print 'Execute jpsurvRest/get_form1'
    print 'Gathering Variables from url'
    print
    #out_json = json.dumps(["foo", {"bar":["baz", null, 1.0, 2]}])
    #my_json = json.dumps([{"Age groups": ["0-49","50-65s","65+"], "Breast stage": ["Localized","Regional","Distant"],"Test group": ["val1","ValTwo","AnotherValue"]}])
    #data =[{'Age groups': ['0-49','50-65s','65+'], 'Breast stage': ['Localized','Regional','Distant'],'Test group': ['val1','ValTwo','AnotherValue']}]
    #data2 = [{"SystemInfo":{"ItemNameInDic":["Output filename","Matrix filename","Database name"],"ItemValueInDic":["h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.txt","h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.ssm","Incidence - SEER 18 Regs Research Data + Hurricane Katrina Impacted Louisiana Cases, Nov 2013 Sub (1973-2011 varying) - Linked To County Attributes - Total U.S., 1969-2012 Counties"]},"SessionOptionInfo":{"ItemNameInDic":["Type","Rate filename","Statistic","SurvivalMethod","SurvivalBeginMonth","SurvivalBeginYear","SurvivalEndMonth","SurvivalEndYear","SurvivalVitalStatus","StudyCutoffDate","LostToFollowupDate","NumberOfIntervals","MonthsPerInterval","RatesDisplayedAs"],"ItemValueInDic":["Survival","U.S. 1970-2009 by individual year (White, Black, Other (AI/API), Ages 0-99, All races for Other Unspec 1991+ and Unknown)","Relative Survival","Actuarial","Month of diagnosis recode","Year of diagnosis","Month of follow-up recode","Year of follow-up recode","Vital status recode (study cutoff used)","12/2011","12/2011","36","12","Percents"]},"ExportOptionInfo":{"ItemNameInDic":["GZipped","Variable format","File format","Field delimiter","Missing character","Fields with delimiter in quotes","Remove thousands separators","Flags included","Variable names included","Column Variables as Stats"],"ItemValueInDic":["false","numeric","DOS/Windows","tab","period","false","true","false","false","false"]},"VarAllInfo":{"ItemNameInDic":["Var1Name","Var2Name","Var2Base","Var3Name","Var3Base","Var4Name","Var4Base","Var5Name","Var6Name","Var7Name","Var8Name","Var9Name","Var10Name","Var11Name","Var12Name","Var13Name","Var14Name","Var15Name","Var16Name","Var17Name","Var18Name"],"ItemValueInDic":["Page type","Age groups","Age recode with <1 year olds","Breast stage","SEER historic stage A","Year of diagnosis: Year of diagnosis 1975+","Year of diagnosis","Interval","Alive at Start","Died","Lost to Followup","Observed Survival (Interval)","Observed Survival (Cum)","Expected Survival (Interval)","Expected Survival (Cum)","Relative Survival (Interval)","Relative Survival (Cum)","Observed SE (Interval)","Observed SE (Cum)","Relative SE (Interval)","Relative SE (Cum)"]},"VarFormatSecList":{"Page type":{"ItemNameInDic":["0","1","2","3","4"],"ItemValueInDic":["Life Page","Summary Page","Z-Statistics Page","Period Life Page","Period Summary Page"]},"Age groups":{"ItemNameInDic":["0","1","2"],"ItemValueInDic":["00-49","45-65s","65+"]},"Breast stage":{"ItemNameInDic":["0","1","2"],"ItemValueInDic":["Localized","Regional","Distant"]},"Year of diagnosis 1975+":{"ItemNameInDic":["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36"],"ItemValueInDic":["1975","1976","1977","1978","1979","1980","1981","1982","1983","1984","1985","1986","1987","1988","1989","1990","1991","1992","1993","1994","1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011"]},"Interval":{"ItemNameInDic":["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36"],"ItemValueInDic":["<1 yr","1-<2 yr","2-<3 yr","3-<4 yr","4-<5 yr","5-<6 yr","6-<7 yr","7-<8 yr","8-<9 yr","9-<10 yr","10-<11 yr","11-<12 yr","12-<13 yr","13-<14 yr","14-<15 yr","15-<16 yr","16-<17 yr","17-<18 yr","18-<19 yr","19-<20 yr","20-<21 yr","21-<22 yr","22-<23 yr","23-<24 yr","24-<25 yr","25-<26 yr","26-<27 yr","27-<28 yr","28-<29 yr","29-<30 yr","30-<31 yr","31-<32 yr","32-<33 yr","33-<34 yr","34-<35 yr","35-<36 yr"]}},"VarLabelInfo":{"FirstPart":["Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var","Var"],"VarIndex":["1","2","2","3","3","4","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18"],"SecondPart":["Name","Name","Base","Name","Base","Name","Base","Name","Name","Name","Name","Name","Name","Name","Name","Name","Name","Name","Name","Name","Name"],"LabelValue":["Page type","Age groups","Age recode with <1 year olds","Breast stage","SEER historic stage A","Year of diagnosis 1975+","Year of diagnosis","Interval","Alive at Start","Died","Lost to Followup","Observed Survival (Interval)","Observed Survival (Cum)","Expected Survival (Interval)","Expected Survival (Cum)","Relative Survival (Interval)","Relative Survival (Cum)","Observed SE (Interval)","Observed SE (Cum)","Relative SE (Interval)","Relative SE (Cum)"]},"VarWithoutFormatItem":["Alive at Start","Died","Lost to Followup","Observed Survival (Interval)","Observed Survival (Cum)","Expected Survival (Interval)","Expected Survival (Cum)","Relative Survival (Interval)","Relative Survival (Cum)","Observed SE (Interval)","Observed SE (Cum)","Relative SE (Interval)","Relative SE (Cum)"]}]
    data3 = [{  "SystemInfo": {    "ItemNameInDic": [      "Output filename",      "Matrix filename",      "Database name"    ],    "ItemValueInDic": [      "h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.txt",      "h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.ssm",      "Incidence - SEER 18 Regs Research Data + Hurricane Katrina Impacted Louisiana Cases, Nov 2013 Sub (1973-2011 varying) - Linked To County Attributes - Total U.S., 1969-2012 Counties"    ]  },  "SessionOptionInfo": {    "ItemNameInDic": [      "Type",      "Rate filename",      "Statistic",      "SurvivalMethod",      "SurvivalBeginMonth",      "SurvivalBeginYear",      "SurvivalEndMonth",      "SurvivalEndYear",      "SurvivalVitalStatus",      "StudyCutoffDate",      "LostToFollowupDate",      "NumberOfIntervals",      "MonthsPerInterval",      "RatesDisplayedAs"    ],    "ItemValueInDic": [      "Survival",      "U.S. 1970-2009 by individual year (White, Black, Other (AI\/API), Ages 0-99, All races for Other Unspec 1991+ and Unknown)",      "Relative Survival",      "Actuarial",      "Month of diagnosis recode",      "Year of diagnosis",      "Month of follow-up recode",      "Year of follow-up recode",      "Vital status recode (study cutoff used)",      "12\/2011",      "12\/2011",      "36",      "12",      "Percents"    ]  },  "ExportOptionInfo": {    "ItemNameInDic": [      "GZipped",      "Variable format",      "File format",      "Field delimiter",      "Missing character",      "Fields with delimiter in quotes",      "Remove thousands separators",      "Flags included",      "Variable names included",      "Column Variables as Stats"    ],    "ItemValueInDic": [      "false",      "numeric",      "DOS\/Windows",      "tab",      "period",      "false",      "true",      "false",      "false",      "false"    ]  },  "VarAllInfo": {    "ItemNameInDic": [      "Var1Name",      "Var2Name",      "Var2Base",      "Var3Name",      "Var3Base",      "Var4Name",      "Var4Base",      "Var5Name",      "Var6Name",      "Var7Name",      "Var8Name",      "Var9Name",      "Var10Name",      "Var11Name",      "Var12Name",      "Var13Name",      "Var14Name",      "Var15Name",      "Var16Name",      "Var17Name",      "Var18Name"    ],    "ItemValueInDic": [      "Page type",      "Age groups",      "Age recode with <1 year olds",      "Breast stage",      "SEER historic stage A",      "Year of diagnosis 1975+",      "Year of diagnosis",      "Interval",      "Alive at Start",      "Died",      "Lost to Followup",      "Observed Survival (Interval)",      "Observed Survival (Cum)",      "Expected Survival (Interval)",      "Expected Survival (Cum)",      "Relative Survival (Interval)",      "Relative Survival (Cum)",      "Observed SE (Interval)",      "Observed SE (Cum)",      "Relative SE (Interval)",      "Relative SE (Cum)"    ]  },  "VarFormatSecList": {    "Page type": {      "ItemNameInDic": [        "0",        "1",        "2",        "3",        "4"      ],      "ItemValueInDic": [        "Life Page",        "Summary Page",        "Z-Statistics Page",        "Period Life Page",        "Period Summary Page"      ]    },    "Age groups": {      "ItemNameInDic": [        "0",        "1",        "2"      ],      "ItemValueInDic": [        "00-49",        "45-65s",        "65+"      ]    },    "Breast stage": {      "ItemNameInDic": [        "0",        "1",        "2"      ],      "ItemValueInDic": [        "Localized",        "Regional",        "Distant"      ]    },    "Year of diagnosis 1975+": {      "ItemNameInDic": [        "0",        "1",        "2",        "3",        "4",        "5",        "6",        "7",        "8",        "9",        "10",        "11",        "12",        "13",        "14",        "15",        "16",        "17",        "18",        "19",        "20",        "21",        "22",        "23",        "24",        "25",        "26",        "27",        "28",        "29",        "30",        "31",        "32",        "33",        "34",        "35",        "36"      ],      "ItemValueInDic": [        "1975",        "1976",        "1977",        "1978",        "1979",        "1980",        "1981",        "1982",        "1983",        "1984",        "1985",        "1986",        "1987",        "1988",        "1989",        "1990",        "1991",        "1992",        "1993",        "1994",        "1995",        "1996",        "1997",        "1998",        "1999",        "2000",        "2001",        "2002",        "2003",        "2004",        "2005",        "2006",        "2007",        "2008",        "2009",        "2010",        "2011"      ]    },    "Interval": {      "ItemNameInDic": [        "1",        "2",        "3",        "4",        "5",        "6",        "7",        "8",        "9",        "10",        "11",        "12",        "13",        "14",        "15",        "16",        "17",        "18",        "19",        "20",        "21",        "22",        "23",        "24",        "25",        "26",        "27",        "28",        "29",        "30",        "31",        "32",        "33",        "34",        "35",        "36"      ],      "ItemValueInDic": [        "<1 yr",        "1-<2 yr",        "2-<3 yr",        "3-<4 yr",        "4-<5 yr",        "5-<6 yr",        "6-<7 yr",        "7-<8 yr",        "8-<9 yr",        "9-<10 yr",        "10-<11 yr",        "11-<12 yr",        "12-<13 yr",        "13-<14 yr",        "14-<15 yr",        "15-<16 yr",        "16-<17 yr",        "17-<18 yr",        "18-<19 yr",        "19-<20 yr",        "20-<21 yr",        "21-<22 yr",        "22-<23 yr",        "23-<24 yr",        "24-<25 yr",        "25-<26 yr",        "26-<27 yr",        "27-<28 yr",        "28-<29 yr",        "29-<30 yr",        "30-<31 yr",        "31-<32 yr",        "32-<33 yr",        "33-<34 yr",        "34-<35 yr",        "35-<36 yr"      ]    }  },  "VarLabelInfo": {    "FirstPart": [      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var"    ],    "VarIndex": [      "1",      "2",      "2",      "3",      "3",      "4",      "4",      "5",      "6",      "7",      "8",      "9",      "10",      "11",      "12",      "13",      "14",      "15",      "16",      "17",      "18"    ],    "SecondPart": [      "Name",      "Name",      "Base",      "Name",      "Base",      "Name",      "Base",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name"    ],    "LabelValue": [      "Page type",      "Age groups",      "Age recode with <1 year olds",      "Breast stage",      "SEER historic stage A",      "Year of diagnosis 1975+",      "Year of diagnosis",      "Interval",      "Alive at Start",      "Died",      "Lost to Followup",      "Observed Survival (Interval)",      "Observed Survival (Cum)",      "Expected Survival (Interval)",      "Expected Survival (Cum)",      "Relative Survival (Interval)",      "Relative Survival (Cum)",      "Observed SE (Interval)",      "Observed SE (Cum)",      "Relative SE (Interval)",      "Relative SE (Cum)"    ]  },  "VarWithoutFormatItem": [    "Alive at Start",    "Died",    "Lost to Followup",    "Observed Survival (Interval)",    "Observed Survival (Cum)",    "Expected Survival (Interval)",    "Expected Survival (Cum)",    "Relative Survival (Interval)",    "Relative Survival (Cum)",    "Observed SE (Interval)",    "Observed SE (Cum)",    "Relative SE (Interval)",    "Relative SE (Cum)"  ]}]
    out_json = json.dumps(data3)

    return current_app.response_class(out_json, mimetype=mimetype)

#@app.route('/jpsurvRest/loadform', methods = ['GET'])
#def load():
#    jsondata = '{"Age groups": ["0-49","50-65s","65+"],"Breast stage": ["Localized","Regional","Distant"],"Test group": ["val1","ValTwo","AnotherValue"]}'
#    return json.dump(jsondata)

@app.route('/jpsurvRest/stage1_upload', methods=['POST'])
def stage1_upload():
    #print "Processing upload"
    debug(OKGREEN+UNDERLINE+BOLD + "****** Stage 1: UPLOAD BUTTON ***** " + ENDC)
    tokenId = request.args.get('tokenId', False)
    info((BOLD + "****** Stage 1: tokenId = %s" + ENDC) % (tokenId))

    for k, v in request.args.iteritems():
        print "var: %s = %s" % (k, v)

    file = request.files['file_control']
    if file and file.filename:
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_DIR, filename))
        file_control_filename = filename
        info("Saving file_control: %s" % file_control_filename)
    file = request.files['file_data']
    if file and file.filename:
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_DIR, filename))
        file_data_filename = filename
        info("Saving file_data: %s" % file_data_filename)

    if(request.files['file_control'] == ''):
        info("file_control not assigned")
    if(request.files['file_data'] == ''):
        info("file_data not assigned")

    #Now that the files are on the server RUN the RCode
    rSource = robjects.r('source')

    #PRINT FILE_CONTROL
    file_control = os.path.join(UPLOAD_DIR, file_control_filename)
    fo = open(file_control, "r+")
    str = fo.read(250)
    fo.close()

    #PRINT FILE_DATA
    file_data = os.path.join(UPLOAD_DIR, file_data_filename)
    fo = open(file_control, "r+")
    str = fo.read(500)
    fo.close()

    #Init the R Source
    rSource = robjects.r('source')
    rSource('./JPSurvWrapper.R')

    # Next two lines execute the R Program
    getDictionary = robjects.globalenv['getDictionary']
    rStrVector = getDictionary(file_control_filename, UPLOAD_DIR, tokenId)
    #Convert R StrVecter to tuple to str

    #keyId = "".join(tuple(rStrVector))
    output_filename = "form-%s.json" % tokenId

    #print output_filename
    #PRINT output_file
    r_output_file = os.path.join(UPLOAD_DIR, output_filename)
    #print "R output_file"
    fo = open(r_output_file, "r+")
    str = fo.read(500)
    #print BOLD+"Read String is : ", str
    #print ENDC
    fo.close()

    #print "CLOSE FILE %s" % output_filename
    #print OKGREEN +"************ END HERE EXIT ********" + ENDC

    #print "json string >> "+str(jsondata[0]);
    status = "uploaded"

    return_url = "%s/jpsurv?request=false&file_control_filename=%s&file_data_filename=%s&output_filename=%s&status=%s&tokenId=%s" % (request.url_root, file_control_filename, file_data_filename, output_filename, status, tokenId)
    info(return_url)
    return redirect(return_url)

@app.route('/jpsurvRest/stage2_calculate', methods=['GET'])
def stage2_calculate():

    print
    print 'Execute jpsurvRest/stage2_calculate'
    print 'Yes, yes, yes...'
    print

    debug(OKGREEN+UNDERLINE+BOLD + "****** Stage 2: CALCULATE BUTTON ***** " + ENDC)

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)
    
    info(BOLD+"**** jpsurvDataString ****"+ENDC)
    info(jpsurvDataString)
    debug(OKBLUE+"The jpsurv STRING::::::"+ENDC)
    debug(jpsurvDataString)
    jpsurvData = json.loads(jpsurvDataString)
    info(BOLD+"**** jpsurvData ****"+ENDC)
    for key, value in jpsurvData.iteritems():
        info("var: %s = %s" % (key, value))
        print("var: %s = %s" % (key, value))
    
    #Init the R Source
    rSource = robjects.r('source')
    rSource('./JPSurvWrapper.R')

    info(BOLD+"**** Calling getFittedResultsWrapper ****"+ENDC)
    getFittedResultWrapper = robjects.globalenv['getFittedResultWrapper']
    getFittedResultWrapper(UPLOAD_DIR, jpsurvDataString)
    # Next two lines execute the R Program
    #try:
    #    getFittedResultWrapper = robjects.globalenv['getFittedResultWrapper']
    #    getFittedResultWrapper(UPLOAD_DIR, jpsurvDataString)
    #except:
    #    return sendTraceback()

    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)
    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage3_recalculate', methods=['GET'])
def stage3_recalculate():

    print 'Go'

    debug(OKGREEN+UNDERLINE+BOLD + "****** Stage 3: PLOT BUTTON ***** " + ENDC)
    info("Recalculating ...")

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)
    
    info(BOLD+"**** jpsurvDataString ****"+ENDC)
    info(jpsurvDataString)
    debug(OKBLUE+"The jpsurv STRING::::::"+ENDC)
    debug(jpsurvDataString)
    jpsurvData = json.loads(jpsurvDataString)
    #info(BOLD+"**** jpsurvData ****"+ENDC)
    for key, value in jpsurvData.iteritems():
        info("var: %s = %s" % (key, value))
        print("var: %s = %s" % (key, value))
    
    #Init the R Source
    rSource = robjects.r('source')
    rSource('./JPSurvWrapper.R')

    info(BOLD+"**** Calling getAllData ****"+ENDC)
    # Next two lines execute the R Program
    getAllData = robjects.globalenv['getAllData']
    getAllData(UPLOAD_DIR, jpsurvDataString)
    
    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)
    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage4_trends_calculate', methods=['GET'])
def stage4_trends_calculate():

    print 'Go'

    debug(OKGREEN+UNDERLINE+BOLD + "****** Stage 4: Trends BUTTON ***** " + ENDC)
    info("Recalculating ...")
    info(BOLD+"**** Calling getTrendsData ****"+ENDC)

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)

    #Init the R Source
    rSource = robjects.r('source')
    rSource('./JPSurvWrapper.R')

    # Next two lines execute the R Program
    getTrendsData = robjects.globalenv['getTrendsData']
    getTrendsData(UPLOAD_DIR, jpsurvDataString)

    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)

@app.route('/jpsurvRest/stage5_queue', methods=['GET'])
def queue():

    debug(OKGREEN+UNDERLINE+BOLD + "****** Stage 5: Queue ***** " + ENDC)
    info("Sending info to queue ...")

    info(BOLD+"**** Calling sendqueue ****"+ENDC)
    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)
    jpsurv_json = json.loads(jpsurvDataString)
    tokenId = jpsurv_json['tokenId']

    print "tokenId"
    print tokenId
    print "print json()"
    print jpsurv_json
    print dir(jpsurv_json)
    for k, v in request.args.iteritems():
        print "var: %s = %s" % (k, v)

    filename = "input_%s.json" % tokenId
    fq = os.path.join(UPLOAD_DIR, filename)
    print "Creating %s" % fq
    text_file = open(fq, "w")
    text_file.write("%s" % jpsurvDataString)
    text_file.close()
    #PRINT FILE_CONTROL
    #file_control = os.path.join(UPLOAD_DIR, file_control_filename)
    #fo = open(file_control, "r+")
    #str = fo.read(250)
    #fo.close()

    sendqueue(tokenId);
    # Next two lines execute the R Program
    #getTrendsData = robjects.globalenv['getTrendsData']
    #getTrendsData(UPLOAD_DIR, jpsurvDataString)

    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)

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

def sendqueue(tokenId):
    #try:
    timestr = time.strftime("%Y-%m-%d")
    QUEUE = jpsurvConfig.getAsString(QUEUE_NAME)
    QUEUE_CONFIG=StompConfig(jpsurvConfig.getAsString(QUEUE_URL)) 
    client = Stomp(QUEUE_CONFIG)
    client.connect()
    client.send(QUEUE,json.dumps({"filepath":UPLOAD_DIR,"token":tokenId,"timestamp":timestr}))
    client.disconnect()
#    return buildSuccess("The request has been received. An email will be sent when the calculation has completed.")
    #except Exception as e:
    #   return buildFailure(str(e))
    return
 
def info(msg):
    d={'clientip': request.remote_addr}
    logger.info('%s', msg, extra=d)


def debug(msg):
    d={'clientip': request.remote_addr}
    logger.debug('%s', msg, extra=d)


import argparse
if __name__ == '__main__':
    QUEUE_NAME = 'queue.name'
    QUEUE_URL = 'queue.url'
    jpsurvConfig = PropertyUtil(r"config.ini")
    UPLOAD_DIR = os.path.join(os.getcwd(), 'tmp')

    print 'JPSurv is starting...'

    #COLORS TO Make logging Mover visible
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    ENDC = '\033[0m'

    parser = argparse.ArgumentParser(
        prog='Python Flask REST Sever',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=textwrap.dedent('''\
         Analysis Tools Flask REST Sever
         --------------------------------
             Each Analysis ToolREST Server has a unique Port Number
             Enter a unique port number when starting Flask REST Server
        '''))
    parser.add_argument("-p", dest="port_number", type=int, required=True, help="REST Sever port number")
    parser.add_argument('--version', action='version', version='%(prog)s 2.0')
    parser.add_argument('--verbose', dest="verbose", default=False, help='Turn on verbose logging', action='store_true')
    parser.add_argument('--debug', help='Turn on debug logging', action='store_true',default=False)

    args = parser.parse_args()
    port_num = int(args.port_number)

    #Logging Levels
    #Level   Numeric value
    #CRITICAL   50
    #ERROR      40
    #WARNING    30
    #INFO       20
    #DEBUG      10
    #NOTSET     0


    #debug(BOLD+UPLOAD_DIR+ENDC)
    FORMAT = '%(asctime)-15s %(clientip)s %(message)s'
    logging.basicConfig(format=FORMAT)
    d = {'clientip': 'localhost'} 
    logger = logging.getLogger('RESTserver')
    #debugger = args.debug == 'True'
    debugger = args.debug

    logger.warning('Log warning works.', extra=d)
    logger.info('Temp Directory: %s', BOLD+UPLOAD_DIR+ENDC, extra=d)
    jpsurvDataString='{"file":{"dictionary":"Breast_RelativeSurvival.dic","data":"Breast_RelativeSurvival.txt","form":"form-506827.json"},"calculate":{"form":{"yearOfDiagnosisRange":[2000,2011],"cohortVars":["Age groups","Breast stage"],"cohortValues":["\"00-49\"","\"Localized\""],"covariateVars":"","maxjoinPoints":0},"static":{"yearOfDiagnosisTitle":"Year of diagnosis 1975+","years":["1975","1976","1977","1978","1979","1980","1981","1982","1983","1984","1985","1986","1987","1988","1989","1990","1991","1992","1993","1994","1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011"],"yearOfDiagnosisVarName":"Year_of_diagnosis_1975","seerFilePrefix":"Breast_RelativeSurvival","allVars":["Age groups","Breast stage","Year_of_diagnosis_1975"],"advanced":{"advDeleteInterval":"F","advBetween":"2","advFirst":"3","advLast":"4","advYear":"10"}}},"plot":{"form":{},"static":{"imageId":0}},"additional":{"headerJoinPoints":0,"yearOfDiagnosis":null,"intervals":[1,4]},"tokenId":"506827","status":"uploaded","stage2completed":0,"queue":{"email":"scott.goldweber@nih.com","url":"http://analysistools-sandbox.nci.nih.gov/jpsurv/?file_control_filename=Breast_RelativeSurvival.dic&file_data_filename=Breast_RelativeSurvival.txt&output_filename=form-506827.json&status=uploaded&tokenId=506827"}}'
#    sendqueue(jpsurvDataString)
    app.run(host='0.0.0.0', port=port_num, debug = debugger,use_evalex = False)
