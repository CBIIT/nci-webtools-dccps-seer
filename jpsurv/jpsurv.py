#!/usr/bin/env python3
import json
import os
import time
import re
import logging
import shutil
import datetime

from flask import Flask, request, redirect, current_app, Response, send_from_directory, jsonify, send_file, abort
from rpy2.robjects import r
from werkzeug.utils import secure_filename
from zipfile import ZipFile, ZIP_DEFLATED
from os.path import dirname, basename, join
from glob import glob
from pathlib import Path
from werkzeug.urls import Href
from urllib.parse import unquote
from argparse import ArgumentParser
from util import Util
from sqs import Queue
from s3 import S3Bucket
from logging.handlers import RotatingFileHandler


args = None
config_file = "../config/config.ini"
if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument('-d', '--debug', action='store_true')
    parser.add_argument("-p", dest="port_number",
                        default="9001", help="Sets the Port")
    args = parser.parse_args()
    if args.debug:
        config_file = "../config/config.dev.ini"


app = Flask(__name__, static_folder='', static_url_path='')
config = Util(config_file)

if not os.path.exists('../logs'):
    os.makedirs('../logs')

formatter = logging.Formatter('%(asctime)s %(levelname)-8s %(message)s',
                              '%Y-%m-%d %H:%M:%S')
time = datetime.datetime.now().strftime("%Y-%m-%d_%H_%M")
logFile = '../logs/jpsurv.log.' + time

size = config.LOG_SIZE
rollover = config.LOG_ROLLOVER

handler = RotatingFileHandler(logFile, mode='a', maxBytes=size,
                              backupCount=rollover, encoding=None, delay=0)
handler.setFormatter(formatter)
handler.setLevel(config.LOG_LEVEL)

logger = logging.getLogger()
logger.setLevel(config.LOG_LEVEL)

logger.addHandler(handler)

app.logger = logger

if not os.path.exists(config.INPUT_DATA_PATH):
    os.makedirs(config.INPUT_DATA_PATH)


def upload_dir(token):
    path = os.path.join(os.getcwd(), config.INPUT_DATA_PATH + token)
    if not os.path.exists(path):
        os.makedirs(path)
    return path


app.logger.debug('JPSurv is starting...')


@app.route('/jpsurvRest/ping/', strict_slashes=False)
@app.route('/ping/', strict_slashes=False)
def ping():
    try:
        return r('"true"')[0]
    except Exception as e:
        app.logger.debug('------------EXCEPTION------------')
        traceback.app.logger.debug_exc(1)
        return str(e), 400


@app.route('/jpsurvRest/status', methods=['GET'])
def status():
    app.logger.debug("Calling status::::::")

    mimetype = 'application/json'
    status = [{"status": "OK"}]
    out_json = json.dumps(status)

    return current_app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage1_upload', methods=['POST'])
def stage1_upload():
    app.logger.debug("****** Stage 1: UPLOAD BUTTON ***** ")
    tokenId = request.args.get('tokenId', False)
    UPLOAD_DIR = upload_dir(tokenId)
    input_type = request.args.get('input_type')

    app.logger.debug(("****** Stage 1: tokenId = %s") % (tokenId))

    # for k, v in list(request.args.items()):
    #     app.logger.debug("var: %s = %s" % (k, v))

    r.source('./JPSurvWrapper.R')

    try:
        if(input_type == "dic"):
            uploaded_files = request.files.getlist("file_control")

            for file in uploaded_files:
                name, ext = os.path.splitext(file.filename)
                if(ext == ".dic"):
                    file_control_filename_clean = secure_filename(
                        file.filename)
                    filename = tokenId+secure_filename(file.filename)
                    file_control_filename = filename
                    dictionary_name = name

                if(ext == ".txt"):
                    file_data_filename_clean = secure_filename(file.filename)
                    filename = tokenId+secure_filename(file.filename)
                    file_data_filename = filename
                    data_name = name

                file.save(os.path.join(UPLOAD_DIR, filename))

            app.logger.debug("Dictionary Name = " + dictionary_name)
            app.logger.debug("Data Name = " + data_name)

            # RENAME DATA FILE TO MATCH DICTIONARY
            if(dictionary_name != data_name):
                os.rename(os.path.join(UPLOAD_DIR, file_data_filename), os.path.join(
                    UPLOAD_DIR, tokenId+file_control_filename_clean[:-4]+".txt"))

            file_control = os.path.join(UPLOAD_DIR, file_control_filename)
            fo = open(file_control, "r+")
            stri = fo.read(250)
            fo.close()

            # PRINT FILE_DATA
            file_data = os.path.join(UPLOAD_DIR, tokenId, file_data_filename)
            fo = open(file_control, "r+")
            stri = fo.read(500)
            fo.close()
            r.getDictionary(file_control_filename, UPLOAD_DIR, tokenId)
            output_filename = "form-%s.json" % tokenId
            r_output_file = os.path.join(UPLOAD_DIR, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()

            base_href = '/'

            # app.logger.debug(request.url_root + base_href)
            url = Href(base_href)(
                request='false',
                file_control_filename=file_control_filename_clean,
                file_data_filename=file_data_filename_clean,
                output_filename=output_filename,
                status='uploaded',
                tokenId=tokenId
            )

            app.logger.debug('url' + url)

            return redirect(url)
    except Exception as e:
        app.logger.debug(e)

    if(input_type == "csv"):

        mapping = request.args.get('map', False)
        has_headers = request.args.get('has_headers', False)
        headers = request.args.get('headers', False)
        # app.logger.debug(headers)
        # app.logger.debug("has headers?")
        # app.logger.debug(has_headers)

        file = request.files['file_control_csv']
        if file and file.filename:
            file_control_filename_clean = secure_filename(file.filename)
            filename = tokenId+secure_filename(file.filename)
            file.save(os.path.join(UPLOAD_DIR, filename))
            file_control_filename = filename
            # app.logger.debug("Saving file_control_csv: %s" %
            #                  file_control_filename)

        if(request.files['file_control_csv'] == ''):
            app.logger.debug("file_control_csv not assigned")

        # PRINT FILE_DATA
        file_data = os.path.join(UPLOAD_DIR, filename)
        # app.logger.debug(file_data)
        # If headers already exist replace with with custom headers user specified frm the UI: headers from json
        if(str(has_headers) == "true"):
            # app.logger.debug("replacing headers")
            # app.logger.debug(file_data)
            with open(file_data, 'r') as file:
                data = file.readlines()
            data[0] = headers+"\n"
            with open(file_data, 'w') as file:
                file.writelines(data)
        # If headers do not exist insert headers before data: headers from json
        if(str(has_headers) == "false"):
            # app.logger.debug("inserting headers")
            # app.logger.debug(file_data)
            with open(file_data, 'r') as file:
                data = file.readlines()
            data.insert(0, headers+"\n")
            with open(file_data, 'w') as file:
                file.writelines(data)

        fo = open(file_data, "r+")
        stri = fo.read(500)
        fo.close()
        # app.logger.debug("SENDING.....")
        try:
            r.ReadCSVFile(file_control_filename, UPLOAD_DIR,
                          tokenId, mapping, input_type)
            output_filename = "form-%s.json" % tokenId
            r_output_file = os.path.join(UPLOAD_DIR, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()

            base_href = '/'

            # app.logger.debug(request.url_root + base_href)
            url = Href(base_href)(
                request='false',
                file_control_filename=file_control_filename_clean,
                output_filename=output_filename,
                status='uploaded',
                tokenId=tokenId
            )

            app.logger.debug("url" + url)

            return redirect(url)

        except:
            status = "failed_upload"
            app.logger.debug("FAILED")
            return_url = "?request=false&status=failed_upload"
            app.logger.debug(return_url)
            return redirect(return_url)


@app.route('/jpsurvRest/import', methods=['POST'])
def myImport():

    def uploadFile(uploadArchive):
        ''' Copy the file to correct directory and changes the extension to zip '''

        # Replace .jpsurv with .zip
        absoluteFilename = os.path.join(
            UPLOAD_DIR, uploadArchive.filename.split(".")[0] + ".zip")

        # app.logger.debug("\tUploading %s and saving it to %s" %
        #                  (uploadedArchive.filename, absoluteFilename))

        uploadArchive.save(absoluteFilename)

        return absoluteFilename

    def unzipFile(absoluteFilename):
        ''' Extract all the files to the dirname(absoluteFilename)'''

        # app.logger.debug(
        #     "\tUnzipping the contents of the zip " + absoluteFilename)

        archive = ZipFile(absoluteFilename)
        archive.extractall(dirname(absoluteFilename))

    def getTokenFor(searchFileListRegularExpression, searchFilenameRegularExpression, archive):
        ''' Will return the first token found from the zip file ( archive ) for the filename containing the serarchRegularExpression '''

        newList = list(filter(
            re.compile(searchFileListRegularExpression).search,
            ZipFile(archive, 'r').namelist()))

        if (len(newList) != None):
            token = re.search(searchFilenameRegularExpression,
                              newList[0]).group(1)
        else:
            token = None

        # app.logger.debug("\tUsing the regular expression \"%s\" for archive \"%s\" found the following filename match with token \"%s\" " % (
        #     searchFileListRegularExpression, archive, token))

        return token

    def getFilenames(fileNameRegularExpression, archive):
        ''' Return the first file mathcing the regular expression '''
        newList = list(filter(
            re.compile(fileNameRegularExpression).search,
            ZipFile(archive, 'r').namelist()))

        # app.logger.debug("\tFor Regular Expression \"%s\" and arhive \"%s\" found %d" % (
        #     fileNameRegularExpression, archive, len(newList)))

        return newList

    def getFilename(fileNameRegularExpression, archive):

        newList = getFilenames(fileNameRegularExpression, archive)

        if (len(newList) > 0):
            filename = newList[0]
        else:
            filename = None

        # app.logger.debug("\tFor Regular Expression \"%s\" and arhive \"%s\" found %s" % (
        #     fileNameRegularExpression, archive, filename))

        return filename

    # Get the first line of the file, and determine the sepaarator.  The algorithm for the code was originally found in
    # the jpsurv.js.
    #
    # When moving to python 3 there is a cvs_sniffer
    def getDelimiter(inputFile):

        line = ""
        with open(inputFile, 'r') as inputFile:
            line = inputFile.readline()

        separator = re.search(r"[,;\s\t]", line).group()

        # app.logger.debug(
        #     "\tThe separator is '%s' for line --> %s" % (separator, line))
        return separator if separator != None else ""

    def fixFilename(absolutePath, tokenId):
        ''' Removes the Token Id from the file name '''
        dirName = dirname(absolutePath)
        baseName = basename(absolutePath)
        baseName = baseName[len(tokenId):]

        fixedAbsolutePath = join(dirName, baseName)

        # app.logger.debug("\tRemoving the token %s for absolutePath %s equates to %s" % (
        #     tokenId, absolutePath, fixedAbsolutePath))

        return fixedAbsolutePath

    def getControlFilename(tokenId):
        filename = "currentState-" + tokenId + ".json"
        controlFile = ""
        with open(os.path.join(UPLOAD_DIR, filename), 'r') as inFile:
            data = json.load(inFile)
            controlFile = data["controlFilename"]

        # app.logger.debug("The control file name is " + controlFile)

        return controlFile

    response = ""

    app.logger.debug("Currently in /jpsurv/import")

    try:
        uploadedArchive = request.files['zipData']

        if (uploadedArchive.filename.split('.', 1)[1] in ['jpsurv'] == False):
            return jsonify("The filename has the wrong extension.  It should end in jpsurv"), 400

        UPLOAD_DIR = upload_dir('tmp')
        zipFilename = uploadFile(uploadedArchive)
        unzipFile(zipFilename)

        # In the zip file itself, I have seen two different token ids used sometimes.  if there were different ids then
        # the filename starting with "form-" has one id and the rest had the other id.
        returnParameters = {}
        returnParameters['tokenIdForForm'] = getTokenFor(
            r"form\-", r"(\d+)", zipFilename)
        returnParameters['tokenIdForRest'] = getTokenFor(
            r"output\-", r"(\d+)", zipFilename)
        returnParameters['imageIdStartCount'] = len(
            getFilenames("plot_Year", zipFilename))

        if(getFilename(r"\.dic", zipFilename) != None):
            returnParameters['controlFile'] = fixFilename(getFilename(
                r"\.dic", zipFilename), returnParameters['tokenIdForForm'])
            returnParameters['txtFile'] = fixFilename(getFilename(
                r"\.txt", zipFilename), returnParameters['tokenIdForForm'])
            returnParameters['type'] = "DIC"
            returnParameters['delimiter'] = "NA"
        else:
            fileNameInZipFile = getFilename(r"\.csv", zipFilename)
            returnParameters['controlFile'] = getControlFilename(
                returnParameters['tokenIdForRest'])
            returnParameters['type'] = "CSV"
            returnParameters['delimiter'] = getDelimiter(
                os.path.join(UPLOAD_DIR, fileNameInZipFile))

        # move contents of tmp to respective folder with tokenId name
        tokenId = returnParameters['tokenIdForRest']
        saveDir = upload_dir(tokenId)
        importFiles = os.listdir(UPLOAD_DIR)

        for fileName in importFiles:
            shutil.move(os.path.join(UPLOAD_DIR, fileName),
                        os.path.join(saveDir, fileName))

        return jsonify(returnParameters)

    except Exception as e:
        app.logger.debug(str(e))
        return_url = "?request=false&status=failed_import"
        return redirect(return_url)

    app.logger.debug("Leaving /jspruv/import")

    return response


@ app.route('/jpsurvRest/export', methods=['GET'])
# Exports the JPSurv Data from the application to a file that is download to the user's computer
def myExport():
    type = request.args['type']
    dictionary = request.args['dictionary']
    form = request.args['form']
    tokenForInput = request.args['inputTokenId']
    tokenId = request.args['tokenId']
    txtFile = request.args['txtFile'] if type == 'dic' else ''
    UPLOAD_DIR = upload_dir(tokenId)

    def gatherFileNames():
        # ''' Gather the files that will be zipped into a file '''

        fileNameSet = set()
        fileNameSet.add(os.path.join(UPLOAD_DIR, tokenForInput + dictionary))
        fileNameSet.add(os.path.join(UPLOAD_DIR, form))

        if txtFile:
            fileNameSet.add(os.path.join(UPLOAD_DIR, tokenForInput + txtFile))

        for filename in getFileBySubstringSearch(tokenId):
            if not re.match(r'^.*\.jpsurv$', filename):
                fileNameSet.add(os.path.join(UPLOAD_DIR, filename))

        # app.logger.debug(
        #     "\tThe set of names to be zipped are: " + str(fileNameSet))

        return fileNameSet

    def addFilesTozip(zip, files):
        # ''' Add a file using an absolute path to the zip archive '''

        if not zip:
            zipName = os.path.join(UPLOAD_DIR, request.args['filename'])
            zip = ZipFile(zipName, "w")

        for file in files:
            zip.write(file, basename(file), compress_type=ZIP_DEFLATED)

        # app.logger.debug("\tThe files were written to zip file ")

        return zip

    def getFileBySubstringSearch(subString):
        # '''
        #     A function that matches a substring to a filename in the UPLOAD_DIR
        #     Using the chdir so that I can change the directory back to the application root when I am done.  I just
        #     want the filename and no directory information.
        # '''
        saveDirectory = os.getcwd()
        os.chdir(UPLOAD_DIR)
        fileList = glob("*" + subString + "*")
        os.chdir(saveDirectory)

        return fileList

    def writeApplicationStateToFile():

        data = request.args
        filename = "currentState-" + request.args['tokenId'] + ".json"
        with open(os.path.join(UPLOAD_DIR, filename), 'w+') as outFile:
            json.dump(data, outFile)

        # app.logger.debug("Written Current state of the form to " + filename)

    try:
        writeApplicationStateToFile()

        zip = addFilesTozip(None, gatherFileNames())
        zip.close()

        type = request.args['type']
        dictFile = request.args['dictionary']
        file_name = request.args['filename']
        # timestamp = time.strftime('%Y%m%d', time.localtime())

        return send_from_directory(UPLOAD_DIR, request.args['filename'],  as_attachment=True, attachment_filename=file_name)

    except Exception as e:
        app.logger.debug(str(e))
        return abort(404, 'Export failed')


@ app.route('/jpsurvRest/stage2_calculate', methods=['GET'])
def stage2_calculate():
    app.logger.debug("****** Stage 2: CALCULATE BUTTON ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))

    # app.logger.debug("jpsurv data start::::::")
    # app.logger.debug(jpsurvDataString)
    # app.logger.debug("jpsurv data end::::::")

    jpsurvData = json.loads(jpsurvDataString)
    token = jpsurvData['tokenId']
    UPLOAD_DIR = upload_dir(token)

    r.source('./JPSurvWrapper.R')

    app.logger.debug("**** Calling getFittedResultsWrapper ****")
    try:
        r.getFittedResultWrapper(UPLOAD_DIR, jpsurvDataString)
        status = 200
        out_json = json.dumps({'status': 'OK'})
    except Exception as e:
        app.logger.debug(e)
        status = 400
        out_json = json.dumps({'msg': str(e)})
    finally:
        return current_app.response_class(out_json, status=status, mimetype='application/json')


@ app.route('/jpsurvRest/stage3_recalculate', methods=['GET'])
def stage3_recalculate():
    app.logger.debug("****** Stage 3: PLOT BUTTON ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))
    app.logger.debug("The jpsurv STRING::::::")
    jpsurvData = json.loads(jpsurvDataString)
    cohort_com = str(jpsurvData["run"])
    app.logger.debug(cohort_com)

    token = jpsurvData['tokenId']
    UPLOAD_DIR = upload_dir(token)

    jpInd = str(jpsurvData["additional"]["headerJoinPoints"])
    app.logger.debug("JPIND")
    app.logger.debug(jpInd)

    recalc = str(jpsurvData["additional"]["recalculate"])
    app.logger.debug("RECALC?")
    app.logger.debug(recalc)

    switch = jpsurvData["switch"]
    app.logger.debug("SWITCH?")
    app.logger.debug(switch)

    use_default = False
    if(str(jpsurvData["additional"]["use_default"]) == "true"):
        use_default = True

    app.logger.debug("USE_DEFAULT")
    app.logger.debug(use_default)

    if (switch == True):
        with open(UPLOAD_DIR + '/cohort_models-'+jpsurvData["tokenId"]+'.json') as data_file:
            data = json.load(data_file)
            # app.logger.debug(data)
            # app.logger.debug("NEW JPIND")
            # app.logger.debug(data[int(cohort_com)-1])
            jpInd = str(data[int(cohort_com)-1])

    fname = UPLOAD_DIR + '/results-' + \
        jpsurvData["tokenId"]+"-"+cohort_com+"-"+jpInd+'.json'
    # app.logger.debug(fname)
    # Init the R Source
    # app.logger.debug(os.path.isfile(fname))
    if(os.path.isfile(fname) == False or recalc == "true"):
        r.source('./JPSurvWrapper.R')
        app.logger.debug("**** Calling getAllData ****")
        # Next line execute the R Program
        try:
            r.getAllData(UPLOAD_DIR, jpsurvDataString, switch, use_default,
                         UPLOAD_DIR + '/cohortCombo-'+jpsurvData["tokenId"]+'.json')
            status = 200
            out_json = json.dumps({'status': 'OK'})
        except Exception as e:
            app.logger.debug(e)
            status = 400
            out_json = json.dumps({'msg': str(e)})
        finally:
            return current_app.response_class(out_json, status=status, mimetype='application/json')
    else:
        return current_app.response_class(json.dumps({'status': 'OK'}), 200, mimetype='application/json')


# @app.route('/jpsurvRest/stage4_trends_calculate', methods=['GET'])
# def stage4_trends_calculate():

#     app.logger.debug('Go')

#     app.logger.debug( "****** Stage 4: Trends BUTTON ***** ")
#     app.logger.debug("Recalculating ...")
#     app.logger.debug("**** Calling getTrendsData ****")

#     jpsurvDataString = unquote(request.args.get('jpsurvData', False))

#     # Init the R Source
#     r.source('./JPSurvWrapper.R')

#     # Next  line execute the R Program
#     r.getTrendsData(UPLOAD_DIR, jpsurvDataString)

#     status = '{"status":"OK"}'
#     mimetype = 'application/json'
#     out_json = json.dumps(status)

#     return current_app.response_class(out_json, mimetype=mimetype)


@ app.route('/jpsurvRest/stage5_queue', methods=['GET'])
def queue():

    app.logger.debug("****** Stage 5: Queue ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))
    jpsurv_json = json.loads(jpsurvDataString)
    tokenId = jpsurv_json['tokenId']
    UPLOAD_DIR = upload_dir(tokenId)
    paramsFile = "input_%s.json" % tokenId
    fq = os.path.join(UPLOAD_DIR, paramsFile)
    text_file = open(fq, "w")
    text_file.write("%s" % jpsurvDataString)
    text_file.close()

    config = Util(config_file)
    timestr = time.strftime("%Y-%m-%d")

    bucket = S3Bucket(config.INPUT_BUCKET, app.logger)
    try:
        # zip work directory and upload to s3
        saveLoc = config.createArchive(UPLOAD_DIR)

        if saveLoc:
            zipFilename = tokenId + '.zip'
            with open(saveLoc, 'rb') as archive:
                object = bucket.uploadFileObj(
                    config.getInputFileKey(zipFilename), archive)
                if object:
                    app.logger.info('Succesfully Uploaded ' + tokenId + '.zip')
                else:
                    app.logger.error('Failed to upload ' + tokenId + '.zip')

            sqs = Queue(app.logger, config)
            sqs.sendMsgToQueue({
                'jobId': tokenId,
                'parameters': {'jpsurvData': paramsFile,
                               'bucket_name': config.INPUT_BUCKET,
                               'key': config.getInputFileKey(zipFilename),
                               'timestamp': timestr}
            }, tokenId)
            return jsonify({
                'enqueued': True,
                'jobId': tokenId,
                'message': 'Job "{}" has been added to queue successfully!'.format(tokenId)
            })
        else:
            app.logger
    except Exception as err:
        message = "Upload to S3 failed!\n" + str(err)
        app.logger.error(message)
        return current_app.response_class(json.dumps(message), 500, mimetype='application/json')

# Download queued job result from S3


@ app.route('/jpsurvRest/downloadS3', methods=['GET'])
def downloadS3():
    file = request.args.get('file')
    config = Util(config_file)
    try:
        bucket = S3Bucket(config.INPUT_BUCKET, app.logger)
        bucket.downloadFile(config.S3_OUTPUT_FOLDER + file,
                            config.OUTPUT_DATA_PATH + file)
        archivePath = os.path.join(os.getcwd(), config.INPUT_DATA_PATH, file)

        with ZipFile(archivePath) as archive:
            archive.extractall(config.OUTPUT_DATA_PATH)

        return current_app.response_class(json.dumps({'status': 'OK'}), 200, mimetype='application/json')
    except Exception as err:
        message = "Download from S3 failed!\n" + str(err)
        app.logger.error(message)
        return current_app.response_class(json.dumps(message), 500, mimetype='application/json')


@ app.route('/jpsurvRest/results', methods=['GET'])
def sendResultsFile():
    file = (request.args.get('file'))
    tokenId = request.args.get('tokenId')
    filePath = config.INPUT_DATA_PATH+tokenId+'/'+file
    fileName = filePath.split('/')[-1]

    if (os.path.exists(filePath) and is_safe_path(tokenId, filePath)):
        return send_file(filePath)
    else:
        return ('', 404)


def sendqueue(tokenId):
    timestr = time.strftime("%Y-%m-%d")
    QUEUE = jpsurvConfig.getAsString(QUEUE_NAME)
    QUEUE_CONFIG = StompConfig(jpsurvConfig.getAsString(QUEUE_URL))
    client = Stomp(QUEUE_CONFIG)
    client.connect()
    client.send(QUEUE, json.dumps(
        {"filepath": UPLOAD_DIR, "token": tokenId, "timestamp": timestr}).encode())
    client.disconnect()


def is_safe_path(tokenId, path, follow_symlinks=True):
    # resolves symbolic links
    if follow_symlinks:
        return os.path.realpath(path).startswith(os.path.realpath(upload_dir(tokenId)))

    return os.path.abspath(path).startswith(os.path.realpath(upload_dir(tokenId)))


def initialize(port, debug=True):
    app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == '__main__':
    @ app.route('/', strict_slashes=False)
    def index():
        return send_file('index.html')

    # app.logger.debug("The root path is " + app.root_path)
    initialize(args.port_number)
