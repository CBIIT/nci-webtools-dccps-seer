#!/usr/bin/env python
import json
import os
import time
from flask import Flask, request, redirect, current_app
from PropertyUtil import PropertyUtil
from rpy2.robjects import r
from stompest.config import StompConfig
from stompest.sync import Stomp
from werkzeug import secure_filename
import os.path
from shutil import copytree, ignore_patterns
app = Flask(__name__, static_folder='', static_url_path='/')

if not os.path.exists('tmp'):
    os.makedirs('tmp')

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

def fix_jpsurv(jpsurvDataString):
    jpsurvDataString = jpsurvDataString.decode("utf-8").replace("{plus}", "+").encode("utf-8")

    print BOLD+"New:::"+ENDC
    print jpsurvDataString

    return jpsurvDataString


@app.route('/jpsurvRest/ping/', strict_slashes=False)
@app.route('/ping/', strict_slashes=False)
def ping():
    try:
        return r('"true"')[0]
    except Exception as e:
        print('------------EXCEPTION------------')
        traceback.print_exc(1)
        return str(e), 400


@app.route('/jpsurvRest/debug', methods = ['GET'])
def test():
    raise

@app.route('/jpsurvRest/parse', methods = ['GET'])
def parse():
    mimetype = 'application/json'

    print
    print 'parse JPSURV'
    print

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)
    print(BOLD+"**** jpsurvDataString ****"+ENDC)
    print type(jpsurvDataString)
    print(jpsurvDataString)
    print(OKGREEN+"The jpsurv STRING::::::"+ENDC)
    print(jpsurvDataString)
    jpsurvData = json.loads(jpsurvDataString)
    print type(jpsurvData)
    out_json = json.dumps(jpsurvData)

    return current_app.response_class(out_json, mimetype=mimetype)

@app.route('/jpsurvRest/status', methods = ['GET'])
def status():
    print(OKGREEN+"Calling status::::::"+ENDC)

    mimetype = 'application/json'
    print("")
    print('Execute jpsurvRest/status status:OK')
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
    data3 = [{  "Systemprint": {    "ItemNameInDic": [      "Output filename",      "Matrix filename",      "Database name"    ],    "ItemValueInDic": [      "h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.txt",      "h:\\JPsurv\\DataTest\\Breast_RelativeSurvival.ssm",      "Incidence - SEER 18 Regs Research Data + Hurricane Katrina Impacted Louisiana Cases, Nov 2013 Sub (1973-2011 varying) - Linked To County Attributes - Total U.S., 1969-2012 Counties"    ]  },  "SessionOptionInfo": {    "ItemNameInDic": [      "Type",      "Rate filename",      "Statistic",      "SurvivalMethod",      "SurvivalBeginMonth",      "SurvivalBeginYear",      "SurvivalEndMonth",      "SurvivalEndYear",      "SurvivalVitalStatus",      "StudyCutoffDate",      "LostToFollowupDate",      "NumberOfIntervals",      "MonthsPerInterval",      "RatesDisplayedAs"    ],    "ItemValueInDic": [      "Survival",      "U.S. 1970-2009 by individual year (White, Black, Other (AI\/API), Ages 0-99, All races for Other Unspec 1991+ and Unknown)",      "Relative Survival",      "Actuarial",      "Month of diagnosis recode",      "Year of diagnosis",      "Month of follow-up recode",      "Year of follow-up recode",      "Vital status recode (study cutoff used)",      "12\/2011",      "12\/2011",      "36",      "12",      "Percents"    ]  },  "ExportOptionInfo": {    "ItemNameInDic": [      "GZipped",      "Variable format",      "File format",      "Field delimiter",      "Missing character",      "Fields with delimiter in quotes",      "Remove thousands separators",      "Flags included",      "Variable names included",      "Column Variables as Stats"    ],    "ItemValueInDic": [      "false",      "numeric",      "DOS\/Windows",      "tab",      "period",      "false",      "true",      "false",      "false",      "false"    ]  },  "VarAllInfo": {    "ItemNameInDic": [      "Var1Name",      "Var2Name",      "Var2Base",      "Var3Name",      "Var3Base",      "Var4Name",      "Var4Base",      "Var5Name",      "Var6Name",      "Var7Name",      "Var8Name",      "Var9Name",      "Var10Name",      "Var11Name",      "Var12Name",      "Var13Name",      "Var14Name",      "Var15Name",      "Var16Name",      "Var17Name",      "Var18Name"    ],    "ItemValueInDic": [      "Page type",      "Age groups",      "Age recode with <1 year olds",      "Breast stage",      "SEER historic stage A",      "Year of diagnosis 1975+",      "Year of diagnosis",      "Interval",      "Alive at Start",      "Died",      "Lost to Followup",      "Observed Survival (Interval)",      "Observed Survival (Cum)",      "Expected Survival (Interval)",      "Expected Survival (Cum)",      "Relative Survival (Interval)",      "Relative Survival (Cum)",      "Observed SE (Interval)",      "Observed SE (Cum)",      "Relative SE (Interval)",      "Relative SE (Cum)"    ]  },  "VarFormatSecList": {    "Page type": {      "ItemNameInDic": [        "0",        "1",        "2",        "3",        "4"      ],      "ItemValueInDic": [        "Life Page",        "Summary Page",        "Z-Statistics Page",        "Period Life Page",        "Period Summary Page"      ]    },    "Age groups": {      "ItemNameInDic": [        "0",        "1",        "2"      ],      "ItemValueInDic": [        "00-49",        "45-65s",        "65+"      ]    },    "Breast stage": {      "ItemNameInDic": [        "0",        "1",        "2"      ],      "ItemValueInDic": [        "Localized",        "Regional",        "Distant"      ]    },    "Year of diagnosis 1975+": {      "ItemNameInDic": [        "0",        "1",        "2",        "3",        "4",        "5",        "6",        "7",        "8",        "9",        "10",        "11",        "12",        "13",        "14",        "15",        "16",        "17",        "18",        "19",        "20",        "21",        "22",        "23",        "24",        "25",        "26",        "27",        "28",        "29",        "30",        "31",        "32",        "33",        "34",        "35",        "36"      ],      "ItemValueInDic": [        "1975",        "1976",        "1977",        "1978",        "1979",        "1980",        "1981",        "1982",        "1983",        "1984",        "1985",        "1986",        "1987",        "1988",        "1989",        "1990",        "1991",        "1992",        "1993",        "1994",        "1995",        "1996",        "1997",        "1998",        "1999",        "2000",        "2001",        "2002",        "2003",        "2004",        "2005",        "2006",        "2007",        "2008",        "2009",        "2010",        "2011"      ]    },    "Interval": {      "ItemNameInDic": [        "1",        "2",        "3",        "4",        "5",        "6",        "7",        "8",        "9",        "10",        "11",        "12",        "13",        "14",        "15",        "16",        "17",        "18",        "19",        "20",        "21",        "22",        "23",        "24",        "25",        "26",        "27",        "28",        "29",        "30",        "31",        "32",        "33",        "34",        "35",        "36"      ],      "ItemValueInDic": [        "<1 yr",        "1-<2 yr",        "2-<3 yr",        "3-<4 yr",        "4-<5 yr",        "5-<6 yr",        "6-<7 yr",        "7-<8 yr",        "8-<9 yr",        "9-<10 yr",        "10-<11 yr",        "11-<12 yr",        "12-<13 yr",        "13-<14 yr",        "14-<15 yr",        "15-<16 yr",        "16-<17 yr",        "17-<18 yr",        "18-<19 yr",        "19-<20 yr",        "20-<21 yr",        "21-<22 yr",        "22-<23 yr",        "23-<24 yr",        "24-<25 yr",        "25-<26 yr",        "26-<27 yr",        "27-<28 yr",        "28-<29 yr",        "29-<30 yr",        "30-<31 yr",        "31-<32 yr",        "32-<33 yr",        "33-<34 yr",        "34-<35 yr",        "35-<36 yr"      ]    }  },  "VarLabelInfo": {    "FirstPart": [      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var",      "Var"    ],    "VarIndex": [      "1",      "2",      "2",      "3",      "3",      "4",      "4",      "5",      "6",      "7",      "8",      "9",      "10",      "11",      "12",      "13",      "14",      "15",      "16",      "17",      "18"    ],    "SecondPart": [      "Name",      "Name",      "Base",      "Name",      "Base",      "Name",      "Base",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name",      "Name"    ],    "LabelValue": [      "Page type",      "Age groups",      "Age recode with <1 year olds",      "Breast stage",      "SEER historic stage A",      "Year of diagnosis 1975+",      "Year of diagnosis",      "Interval",      "Alive at Start",      "Died",      "Lost to Followup",      "Observed Survival (Interval)",      "Observed Survival (Cum)",      "Expected Survival (Interval)",      "Expected Survival (Cum)",      "Relative Survival (Interval)",      "Relative Survival (Cum)",      "Observed SE (Interval)",      "Observed SE (Cum)",      "Relative SE (Interval)",      "Relative SE (Cum)"    ]  },  "VarWithoutFormatItem": [    "Alive at Start",    "Died",    "Lost to Followup",    "Observed Survival (Interval)",    "Observed Survival (Cum)",    "Expected Survival (Interval)",    "Expected Survival (Cum)",    "Relative Survival (Interval)",    "Relative Survival (Cum)",    "Observed SE (Interval)",    "Observed SE (Cum)",    "Relative SE (Interval)",    "Relative SE (Cum)"  ]}]
    out_json = json.dumps(data3)

    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage1_upload', methods=['POST'])
def stage1_upload():
    print(OKGREEN+UNDERLINE+BOLD + "****** Stage 1: UPLOAD BUTTON ***** " + ENDC)
    tokenId = request.args.get('tokenId', False)
    input_type = request.args.get('input_type')

    print("Input type")
    print(input_type)

    print((BOLD + "****** Stage 1: tokenId = %s" + ENDC) % (tokenId))

    for k, v in request.args.iteritems():
        print "var: %s = %s" % (k, v)
    r.source('./JPSurvWrapper.R')
    try:
        if(input_type=="dic"):
            uploaded_files = request.files.getlist("file_control")
            print("got files")
            for file in uploaded_files:
                name, ext = os.path.splitext(file.filename)
                if(ext==".dic"):
                    file_control_filename_clean=secure_filename(file.filename)
                    filename = tokenId+secure_filename(file.filename)
                    file_control_filename = filename
                    dictionary_name=name
                if(ext==".txt"):
                    file_data_filename_clean=secure_filename(file.filename)
                    filename = tokenId+secure_filename(file.filename)
                    file_data_filename = filename
                    data_name=name
                file.save(os.path.join(UPLOAD_DIR, filename))
            print (dictionary_name)
            print(data_name)

            if(dictionary_name!=data_name):
                os.rename(os.path.join(UPLOAD_DIR, file_data_filename), os.path.join(UPLOAD_DIR, tokenId+dictionary_name+".txt"))
            #PRINT FILE_CONTROL

            file_control = os.path.join(UPLOAD_DIR,file_control_filename)
            fo = open(file_control, "r+")
            stri = fo.read(250)
            fo.close()

            #PRINT FILE_DATA
            file_data = os.path.join(UPLOAD_DIR,tokenId,file_data_filename)
            fo = open(file_control, "r+")
            stri = fo.read(500)
            fo.close()
            r.getDictionary(file_control_filename, UPLOAD_DIR, tokenId)
            output_filename = "form-%s.json" % tokenId

            r_output_file = os.path.join(UPLOAD_DIR, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()
            status = "uploaded"
            return_url = "%s/jpsurv?request=false&file_control_filename=%s&file_data_filename=%s&output_filename=%s&status=%s&tokenId=%s" % (request.url_root, file_control_filename_clean, file_data_filename_clean, output_filename, status, tokenId)
            print(return_url)
            return redirect(return_url)
    except Exception as e: print(e)

    if(input_type=="csv"):

        mapping = request.args.get('map',False)
        has_headers = request.args.get('has_headers',False)
        headers= request.args.get('headers',False)
        print(headers)
        print("has headers?")
        print (has_headers)


        file = request.files['file_control_csv']
        if file and file.filename:
            file_control_filename_clean=secure_filename(file.filename)
            filename = tokenId+secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_DIR, filename))
            file_control_filename = filename
            print("Saving file_control_csv: %s" % file_control_filename)

        if(request.files['file_control_csv'] == ''):
            print("file_control_csv not assigned")

        #PRINT FILE_DATA
        file_data = os.path.join(UPLOAD_DIR,filename)
        print(file_data)
        #If headers already exist replace with with custom headers user specified frm the UI: headers from json
        if(str(has_headers)=="true"):
            print("replacing headers")
            print(file_data)
            with open(file_data, 'r') as file:
                 data = file.readlines()
            data[0]=headers+"\n"
            with open(file_data, 'w') as file:
                file.writelines(data)
        #If headers do not exist insert headers before data: headers from json
        if(str(has_headers)=="false"):
            print("inserting headers")
            print(file_data)
            with open(file_data, 'r') as file:
                 data = file.readlines()
            data.insert(0,headers+"\n")
            with open(file_data, 'w') as file:
                file.writelines(data)

        fo = open(file_data, "r+")
        stri = fo.read(500)
        fo.close()
        print("SENDING.....")
        try:
            r.ReadCSVFile(file_control_filename, UPLOAD_DIR, tokenId,mapping,input_type)
            output_filename = "form-%s.json" % tokenId
            r_output_file = os.path.join(UPLOAD_DIR, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()
            status = "uploaded"
            return_url = "%s/jpsurv?request=false&file_control_filename=%s&output_filename=%s&status=%s&tokenId=%s" % (request.url_root, file_control_filename_clean, output_filename, status, tokenId)
            print(return_url)
            return redirect(return_url)
        except:
            status = "failed_upload"
            print "FAILED"
            return_url = "/jpsurv?request=false&status=failed_upload"
            print(return_url)
            return redirect(return_url)

    #Now that the files are on the server RUN the RCode



    #Init the R Source



@app.route('/jpsurvRest/stage2_calculate', methods=['GET'])
def stage2_calculate():


    print 'Execute jpsurvRest/stage2_calculate'
    print 'Yes, yes, yes...'
    print

    print(OKGREEN+UNDERLINE+BOLD + "****** Stage 2: CALCULATE BUTTON ***** " + ENDC)

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)

    print(BOLD+"**** jpsurvDataString ****"+ENDC)
    print(jpsurvDataString)
    print(OKBLUE+"The jpsurv STRING::::::"+ENDC)
    print(jpsurvDataString)
    jpsurvData = json.loads(jpsurvDataString)
    print(BOLD+"**** jpsurvData ****"+ENDC)
    for key, value in jpsurvData.iteritems():
        print("var: %s = %s" % (key, value))
        print("var: %s = %s" % (key, value))

    #Init the R Source
    r.source('./JPSurvWrapper.R')

    print(BOLD+"**** Calling getFittedResultsWrapper ****"+ENDC)
    r.getFittedResultWrapper(UPLOAD_DIR, jpsurvDataString)

    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)
    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage3_recalculate', methods=['GET'])
def stage3_recalculate():

    print 'Go'
    #time.sleep(3)
    print(OKGREEN+UNDERLINE+BOLD + "****** Stage 3: PLOT BUTTON ***** " + ENDC)
    print("Recalculating ...")

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)

    print(BOLD+"**** jpsurvDataString ****"+ENDC)
    print(OKBLUE+"The jpsurv STRING::::::"+ENDC)
    jpsurvData = json.loads(jpsurvDataString)
    cohort_com=str(jpsurvData["run"])
    print(cohort_com)

    print("JPIND")
    jpInd=str(jpsurvData["additional"]["headerJoinPoints"])
    print(jpInd)

    print("RECALC?")
    recalc=str(jpsurvData["additional"]["recalculate"])
    print(recalc)

    print("SWITCH?")
    switch=jpsurvData["switch"]
    print(switch)

    use_default=False
    if(str(jpsurvData["additional"]["use_default"])=="true"):
        use_default=True

    print("USE_DEFAULT")
    print(use_default)




    if (switch==True):
        with open('tmp/cohort_models-'+jpsurvData["tokenId"]+'.json') as data_file:
            data = json.load(data_file)
            print (data)
            print("NEW JPIND")
            print(data[int(cohort_com)-1])
            jpInd=str(data[int(cohort_com)-1])


    fname='tmp/results-'+jpsurvData["tokenId"]+"-"+cohort_com+"-"+jpInd+'.json'
    print(fname)


    #Init the R Source
    print(os.path.isfile(fname))
    if(os.path.isfile(fname)==False or recalc=="true"):

        r.source('./JPSurvWrapper.R')

        print(BOLD+"**** Calling getAllData ****"+ENDC)
        # Next line execute the R Program
        r.getAllData(UPLOAD_DIR, jpsurvDataString,switch,use_default)

    print("GOT RESULTS!")
    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)
    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage4_trends_calculate', methods=['GET'])
def stage4_trends_calculate():

    print 'Go'

    print(OKGREEN+UNDERLINE+BOLD + "****** Stage 4: Trends BUTTON ***** " + ENDC)
    print("Recalculating ...")
    print(BOLD+"**** Calling getTrendsData ****"+ENDC)

    jpsurvDataString = request.args.get('jpsurvData', False)
    jpsurvDataString = fix_jpsurv(jpsurvDataString)

    #Init the R Source
    r.source('./JPSurvWrapper.R')

    # Next  line execute the R Program
    r.getTrendsData(UPLOAD_DIR, jpsurvDataString)

    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)

@app.route('/jpsurvRest/stage5_queue', methods=['GET'])
def queue():

    print(OKGREEN+UNDERLINE+BOLD + "****** Stage 5: Queue ***** " + ENDC)
    print("Sending info to queue ...")

    print(BOLD+"**** Calling sendqueue ****"+ENDC)
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


    sendqueue(tokenId);


    status = '{"status":"OK"}'
    mimetype = 'application/json'
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)


def sendqueue(tokenId):
    #try:
    timestr = time.strftime("%Y-%m-%d")
    QUEUE = jpsurvConfig.getAsString(QUEUE_NAME)
    QUEUE_CONFIG=StompConfig(jpsurvConfig.getAsString(QUEUE_URL))
    client = Stomp(QUEUE_CONFIG)
    client.connect()
    client.send(QUEUE,json.dumps({"filepath":UPLOAD_DIR,"token":tokenId,"timestamp":timestr}))
    client.disconnect()

    return
