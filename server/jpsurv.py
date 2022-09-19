#!/usr/bin/env python3
import json
import re
import shutil
import datetime

from os import path, getcwd, rename, chdir, listdir
from traceback import format_exc
from flask import Flask, request, redirect, Response, send_from_directory, jsonify, send_file, abort, url_for
from flask_cors import CORS
from rpy2.robjects import r
from werkzeug.utils import secure_filename
from werkzeug.urls import url_encode
from zipfile import ZipFile, ZIP_DEFLATED
from glob import glob
from werkzeug.security import safe_join
from urllib.parse import unquote
from argparse import ArgumentParser
from utils import make_dirs, read_config, createArchive, create_rotating_log
from sqs import Queue
from s3 import S3Bucket
from uuid import uuid4
from pathlib import Path


if __name__ == '__main__':
    parser = ArgumentParser()
    parser.add_argument('-d', '--debug', action='store_true')
    parser.add_argument("-p", dest="port_number",
                        default="9001", help="Sets the Port")
    args = parser.parse_args()
    # Serve current directory using Flask for local development
    app = Flask(__name__, static_folder='', static_url_path='')

else:
    # Otherwise, assume mod_wsgi/apache will serve static files
    app = Flask(__name__, static_folder=None)

# enable CORS
CORS(app)

# disable caching of static files
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Load configuration from file
app.config.update(read_config('../config/config.ini'))

# create logger
app.logger = create_rotating_log('JPSurv', app.config)


@app.before_request
def before_request():
    """ Ensure input/output directories exist """
    config = app.config['folders']
    make_dirs(
        config['input_dir'],
        config['output_dir']
    )


@app.errorhandler(Exception)
def error_handler(e):
    """ Ensure errors are logged and returned as json """
    app.logger.error(format_exc())
    output = getattr(e, 'output', None)
    return jsonify(
        output.decode('utf-8') if output
        else str(e)
    ), 500


def getInputDir(token):
    input_dir = safe_join(app.config['folders']['input_dir'], token)
    if not path.exists(input_dir):
        make_dirs(input_dir)
    return input_dir


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


@app.route('/jpsurvRest/stage1_upload', methods=['POST'])
def stage1_upload():
    app.logger.debug("****** Stage 1: UPLOAD BUTTON ***** ")

    # get params
    tokenId = request.args.get('tokenId', False)
    input_type = request.args.get('input_type')

    input_dir = getInputDir(tokenId)

    app.logger.debug(("****** Stage 1: tokenId = %s") % (tokenId))

    # for k, v in list(request.args.items()):
    #     app.logger.debug("var: %s = %s" % (k, v))

    r.source('./JPSurvWrapper.R')

    try:
        if(input_type == "dic"):
            uploaded_files = request.files.getlist("file_control")

            for file in uploaded_files:
                name, ext = path.splitext(file.filename)
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

                file.save(path.join(input_dir, filename))

            app.logger.debug("Dictionary Name = " + dictionary_name)
            app.logger.debug("Data Name = " + data_name)

            # RENAME DATA FILE TO MATCH DICTIONARY
            if(dictionary_name != data_name):
                rename(path.join(input_dir, file_data_filename), path.join(
                    input_dir, tokenId+file_control_filename_clean[:-4]+".txt"))

            file_control = path.join(input_dir, file_control_filename)
            fo = open(file_control, "r+")
            stri = fo.read(250)
            fo.close()

            # PRINT FILE_DATA
            file_data = path.join(input_dir, tokenId, file_data_filename)
            fo = open(file_control, "r+")
            stri = fo.read(500)
            fo.close()
            r.getDictionary(file_control_filename, input_dir, tokenId)
            output_filename = "form-%s.json" % tokenId
            r_output_file = path.join(input_dir, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()

            base_href = '/' if __name__ == '__main__' else '/jpsurv'

            # app.logger.debug(request.url_root + base_href)
            url = base_href + '?' + url_encode({
                'request': 'false',
                'file_control_filename': file_control_filename_clean,
                'file_data_filename': file_data_filename_clean,
                'output_filename': output_filename,
                'status': 'uploaded',
                'tokenId': tokenId
            })

            app.logger.debug('url' + url)

            return jsonify({'redirect': url})
            # return redirect(url)

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
            file.save(path.join(input_dir, filename))
            file_control_filename = filename
            # app.logger.debug("Saving file_control_csv: %s" %
            #                  file_control_filename)

        if(request.files['file_control_csv'] == ''):
            app.logger.debug("file_control_csv not assigned")

        # PRINT FILE_DATA
        file_data = path.join(input_dir, filename)
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
            r.ReadCSVFile(file_control_filename, input_dir,
                          tokenId, mapping, input_type)
            output_filename = "form-%s.json" % tokenId
            r_output_file = path.join(input_dir, output_filename)
            fo = open(r_output_file, "r+")
            stri = fo.read(500)
            fo.close()

            base_href = '/' if __name__ == '__main__' else '/jpsurv'

            # app.logger.debug(request.url_root + base_href)
            url = base_href + '?' + url_encode({
                'request': 'false',
                'file_control_filename': file_control_filename_clean,
                'output_filename': output_filename,
                'status': 'uploaded',
                'tokenId': tokenId
            })

            app.logger.debug("url" + url)

            return jsonify({'redirect': url})
            # return redirect(url)

        except Exception as e:
            app.logger.error("Upload Failed")
            app.logger.error(e)
            return jsonify(str(e)), 500


@app.route('/jpsurvRest/import', methods=['POST'])
def myImport():

    def uploadFile(uploadArchive):
        ''' Copy the file to correct directory and changes the extension to zip '''

        # Replace .jpsurv with .zip
        absoluteFilename = path.join(
            input_dir, uploadArchive.filename.split(".")[0] + ".zip")

        # app.logger.debug("\tUploading %s and saving it to %s" %
        #                  (uploadedArchive.filename, absoluteFilename))

        uploadArchive.save(absoluteFilename)

        return absoluteFilename

    def unzipFile(absoluteFilename):
        ''' Extract all the files to the dirname(absoluteFilename)'''

        # app.logger.debug(
        #     "\tUnzipping the contents of the zip " + absoluteFilename)

        archive = ZipFile(absoluteFilename)
        archive.extractall(path.dirname(absoluteFilename))

    def getTokenFor(searchFileListRegularExpression,  archive):
        ''' Will return the first token found from the zip file ( archive ) for the filename containing the serarchRegularExpression '''

        valid_uuid = re.compile(
            '[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}', re.I)

        newList = list(filter(
            re.compile(searchFileListRegularExpression).search,
            ZipFile(archive, 'r').namelist()))

        if (len(newList) > 0):
            found_uuid = valid_uuid.search(newList[0])
            if found_uuid is None:
                return None
            else:
                return found_uuid.group()
        else:
            return None

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
        dirName = path.dirname(absolutePath)
        baseName = path.basename(absolutePath)
        baseName = baseName[len(tokenId):]

        fixedAbsolutePath = path.join(dirName, baseName)

        # app.logger.debug("\tRemoving the token %s for absolutePath %s equates to %s" % (
        #     tokenId, absolutePath, fixedAbsolutePath))

        return fixedAbsolutePath

    def getControlFilename(tokenId):
        filename = "currentState-" + tokenId + ".json"
        controlFile = ""
        with open(path.join(input_dir, filename), 'r') as inFile:
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

        input_dir = getInputDir('tmp')
        zipFilename = uploadFile(uploadedArchive)
        unzipFile(zipFilename)

        # In the zip file itself, I have seen two different token ids used sometimes.  if there were different ids then
        # the filename starting with "form-" has one id and the rest had the other id.
        returnParameters = {}
        returnParameters['tokenIdForForm'] = getTokenFor(
            r"form\-",  zipFilename)
        returnParameters['tokenIdForRest'] = getTokenFor(
            r"output\-",  zipFilename)
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
                path.join(input_dir, fileNameInZipFile))

        # move contents of tmp to respective folder with tokenId name
        tokenId = returnParameters['tokenIdForRest']
        saveDir = getInputDir(tokenId)
        importFiles = listdir(input_dir)

        for fileName in importFiles:
            shutil.move(path.join(input_dir, fileName),
                        path.join(saveDir, fileName))

        return jsonify(returnParameters)

    except Exception as e:
        app.logger.debug(str(e))
        return jsonify(e), 500


@app.route('/jpsurvRest/export', methods=['GET'])
# Exports the JPSurv Data from the application to a file that is download to the user's computer
def myExport():
    type = request.args['type']
    dictionary = request.args['dictionary']
    form = request.args['form']
    tokenId = request.args['tokenId']
    txtFile = request.args['txtFile'] if type == 'dic' else ''
    input_dir = getInputDir(tokenId)

    def gatherFileNames():
        # ''' Gather the files that will be zipped into a file '''

        fileNameSet = set()
        fileNameSet.add(path.join(input_dir, tokenId + dictionary))
        fileNameSet.add(path.join(input_dir, form))

        if txtFile:
            fileNameSet.add(path.join(input_dir, tokenId + txtFile))

        for filename in getFileBySubstringSearch(tokenId):
            if not re.match(r'^.*\.jpsurv$', filename):
                fileNameSet.add(path.join(input_dir, filename))

        # app.logger.debug(
        #     "\tThe set of names to be zipped are: " + str(fileNameSet))

        return fileNameSet

    def addFilesTozip(zip, files):
        # ''' Add a file using an absolute path to the zip archive '''

        if not zip:
            zipName = path.join(input_dir, request.args['filename'])
            zip = ZipFile(zipName, "w")

        for file in files:
            zip.write(file, path.basename(file), compress_type=ZIP_DEFLATED)

        # app.logger.debug("\tThe files were written to zip file ")

        return zip

    def getFileBySubstringSearch(subString):
        # '''
        #     A function that matches a substring to a filename in the input_dir
        #     Using the chdir so that I can change the directory back to the application root when I am done.  I just
        #     want the filename and no directory information.
        # '''
        saveDirectory = getcwd()
        chdir(input_dir)
        fileList = glob("*" + subString + "*")
        chdir(saveDirectory)

        return fileList

    def writeApplicationStateToFile():

        data = request.args
        filename = "currentState-" + request.args['tokenId'] + ".json"
        with open(path.join(input_dir, filename), 'w+') as outFile:
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

        return send_from_directory(input_dir, request.args['filename'],  as_attachment=True, attachment_filename=file_name)

    except Exception as e:
        app.logger.debug(str(e))
        return abort(404, 'Export failed')


@app.route('/jpsurvRest/stage2_calculate', methods=['GET'])
def stage2_calculate():
    app.logger.debug("****** Stage 2: CALCULATE BUTTON ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))

    # app.logger.debug("jpsurv data start::::::")
    # app.logger.debug(jpsurvDataString)
    # app.logger.debug("jpsurv data end::::::")

    jpsurvData = json.loads(jpsurvDataString)
    token = jpsurvData['tokenId']
    input_dir = getInputDir(token)

    r.source('./JPSurvWrapper.R')

    app.logger.debug("**** Calling getFittedResultsWrapper ****")
    try:
        r.getFittedResultWrapper(input_dir, jpsurvDataString)
        status = 200
        out_json = json.dumps({'status': 'OK'})
    except Exception as e:
        app.logger.debug(e)
        status = 400
        out_json = json.dumps({'msg': str(e)})
    finally:
        return app.response_class(out_json, status=status, mimetype='application/json')


@app.route('/jpsurvRest/stage3_recalculate', methods=['GET'])
def stage3_recalculate():
    app.logger.debug("****** Stage 3: PLOT BUTTON ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))
    app.logger.debug("The jpsurv STRING::::::")
    jpsurvData = json.loads(jpsurvDataString)
    cohort_com = str(jpsurvData["run"])
    app.logger.debug(cohort_com)

    token = jpsurvData['tokenId']
    input_dir = getInputDir(token)

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
        with open(input_dir + '/cohort_models-'+jpsurvData["tokenId"]+'.json') as data_file:
            data = json.load(data_file)
            # app.logger.debug(data)
            # app.logger.debug("NEW JPIND")
            # app.logger.debug(data[int(cohort_com)-1])
            jpInd = str(data[int(cohort_com)-1])

    fname = input_dir + '/results-' + \
        jpsurvData["tokenId"]+"-"+cohort_com+"-"+jpInd+'.json'
    # app.logger.debug(fname)
    # Init the R Source
    # app.logger.debug(path.isfile(fname))
    if(path.isfile(fname) == False or recalc == "true"):
        r.source('./JPSurvWrapper.R')
        app.logger.debug("**** Calling getAllData ****")
        # Next line execute the R Program
        try:
            r.getAllData(input_dir, jpsurvDataString, switch, use_default,
                         input_dir + '/cohortCombo-'+jpsurvData["tokenId"]+'.json')
            status = 200
            out_json = json.dumps({'status': 'OK'})
        except Exception as e:
            app.logger.debug(e)
            status = 400
            out_json = json.dumps({'msg': str(e)})
        finally:
            return app.response_class(out_json, status=status, mimetype='application/json')
    else:
        return app.response_class(json.dumps({'status': 'OK'}), 200, mimetype='application/json')


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
#     r.getTrendsData(input_dir, jpsurvDataString)

#     status = '{"status":"OK"}'
#     mimetype = 'application/json'
#     out_json = json.dumps(status)

#     return app.response_class(out_json, mimetype=mimetype)


@app.route('/jpsurvRest/stage5_queue', methods=['GET'])
def queue():
    app.logger.debug("****** Stage 5: Queue ***** ")

    jpsurvDataString = unquote(request.args.get('jpsurvData', False))
    jpsurv_json = json.loads(jpsurvDataString)
    tokenId = jpsurv_json['tokenId']
    input_dir = getInputDir(tokenId)
    paramsFile = "input_%s.json" % tokenId
    fq = path.join(input_dir, paramsFile)
    with open(fq, 'w') as writer:
        writer.write(jpsurvDataString)

    bucket = S3Bucket(app.config['s3']['bucket'], app.logger)
    try:
        # zip work directory and upload to s3
        archivePath = createArchive(input_dir)
        s3InputKey = path.join(app.config['s3']['input_dir'], tokenId + '.zip')

        if archivePath:
            with open(archivePath, 'rb') as archive:
                object = bucket.uploadFileObj(s3InputKey, archive)
                if object:
                    app.logger.info('Succesfully Uploaded ' + tokenId + '.zip')
                else:
                    app.logger.error('Failed to upload ' + tokenId + '.zip')

            messageId = str(uuid4())
            sqs = Queue(app.logger, app.config)
            sqs.sendMsgToQueue({
                'id': tokenId,
                'state': jpsurv_json,
                'inputKey': s3InputKey,
                'timestamp': datetime.datetime.now().strftime("%Y-%m-%d")
            }, messageId)
            return jsonify({
                'enqueued': True,
                'jobId': tokenId,
                'message': 'Job "{}" has been added to queue successfully!'.format(tokenId)
            })
        else:
            msg = 'failed to archive input files'
            app.logger.error(msg)
            return app.response_class(json.dumps(msg), 500, mimetype='application/json')

    except Exception as err:
        message = "Upload to S3 failed!\n"
        app.logger.error(message)
        app.logger.exception(err)
        return app.response_class(json.dumps(err), 500, mimetype='application/json')

# Download queued job result from S3


@app.route('/jpsurvRest/downloadS3', methods=['GET'])
def downloadS3():
    file = request.args.get('file')
    id = Path(file).stem
    key = path.join(app.config['s3']['output_dir'], file)
    archivePath = path.join(app.config['folders']['output_dir'], file)
    extractPath = path.join(app.config['folders']['output_dir'], id)

    try:
        bucket = S3Bucket(app.config['s3']['bucket'], app.logger)
        bucket.downloadFile(key, archivePath)

        with ZipFile(archivePath) as archive:
            archive.extractall(extractPath)

        return app.response_class(json.dumps({'status': 'OK'}), 200, mimetype='application/json')
    except Exception as err:
        message = "Download from S3 failed!\n" + str(err)
        app.logger.error(message)
        app.logger.exception(err)
        return app.response_class(json.dumps(message), 500, mimetype='application/json')


@app.route('/jpsurvRest/results', methods=['GET'])
def sendResultsFile():
    file = (request.args.get('file'))
    tokenId = request.args.get('tokenId')
    filePath = safe_join(app.config['folders']['input_dir'], tokenId, file)
    app.logger.debug(filePath)
    # fileName = filePath.split('/')[-1]

    if (path.exists(filePath)):
        return send_file(filePath)
    else:
        return ('', 404)


@app.route('/api/queueDownload', methods=['POST'])
def queueDownload():
    app.logger.debug("queueing full dataset download")

    id, state = request.json.values()

    input_dir = getInputDir(id)

    bucket = S3Bucket(app.config['s3']['bucket'], app.logger)
    try:
        # zip work directory and upload to s3
        archivePath = createArchive(input_dir)
        s3InputKey = path.join(app.config['s3']['input_dir'], id + '.zip')

        if archivePath:
            with open(archivePath, 'rb') as archive:
                object = bucket.uploadFileObj(s3InputKey, archive)
                if object:
                    app.logger.info('Succesfully Uploaded ' + id + '.zip')
                else:
                    app.logger.error('Failed to upload ' + id + '.zip')

            messageId = str(uuid4())
            sqs = Queue(app.logger, app.config, 'download')
            sqs.sendMsgToQueue({
                'id': id,
                'state': state,
                'inputKey': s3InputKey,
                'timestamp': datetime.datetime.now().strftime("%Y-%m-%d")
            }, messageId)
            app.logger.info('Succesfully enqueued ' + id)
            return jsonify({
                'enqueued': True,
                'jobId': id,
                'message': 'Job "{}" has been added to queue successfully!'.format(id)
            })
        else:
            msg = 'failed to archive input files'
            app.logger.error(msg)
            return app.response_class(json.dumps(msg), 500, mimetype='application/json')

    except Exception as err:
        message = "Upload to S3 failed!\n"
        app.logger.error(message)
        app.logger.exception(err)
        return app.response_class(json.dumps(err), 500, mimetype='application/json')


@app.route('/api/queueDownloadResult', methods=['GET'])
def getQueuedDataset():
    filename = request.args.get('dataset')
    archive = request.args.get('archive')
    id = Path(archive).stem
    key = path.join(app.config['s3']['output_dir'], archive)
    zipSave = path.join(app.config['folders']['output_dir'], archive)
    extractPath = path.join(app.config['folders']['output_dir'], id)
    file = path.join(extractPath, filename)

    try:
        bucket = S3Bucket(app.config['s3']['bucket'], app.logger)
        bucket.downloadFile(key, zipSave)

        with ZipFile(zipSave) as archive:
            archive.extractall(extractPath)

        return send_file(file, as_attachment=True)
    except Exception as err:
        message = "Download from S3 failed!\n" + str(err)
        app.logger.error(message)
        app.logger.exception(err)
        return app.response_class(json.dumps(message), 500, mimetype='application/json')


@app.route('/api/recalculateBatch', methods=['POST'])
def recalculateBatch():
    paramsArray = request.json

    def recalculate(jpsurvData):
        jpsurvDataString = json.dumps(jpsurvData)
        cohort_com = str(jpsurvData["run"])
        app.logger.debug(cohort_com)

        token = jpsurvData['tokenId']
        input_dir = getInputDir(token)

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
            with open(input_dir + '/cohort_models-'+jpsurvData["tokenId"]+'.json') as data_file:
                data = json.load(data_file)
                # app.logger.debug(data)
                # app.logger.debug("NEW JPIND")
                # app.logger.debug(data[int(cohort_com)-1])
                jpInd = str(data[int(cohort_com)-1])

        fname = input_dir + '/results-' + \
            jpsurvData["tokenId"]+"-"+cohort_com+"-"+jpInd+'.json'
        # app.logger.debug(fname)
        # Init the R Source
        # app.logger.debug(path.isfile(fname))

        if(path.isfile(fname) == False or recalc == "true"):
            r.source('./JPSurvWrapper.R')
            app.logger.debug("**** Calling getAllData ****")
            # Next line execute the R Program
            try:
                file = r.getAllData(input_dir, jpsurvDataString, switch, use_default,
                                    input_dir + '/cohortCombo-'+jpsurvData["tokenId"]+'.json')
                with open(fname, 'r') as jsonFile:
                    return json.load(jsonFile)
            except Exception as e:
                app.logger.debug(e)
                return json.loads(r'{}')
        else:
            with open(fname, 'r') as jsonFile:
                return json.load(jsonFile)

    resultFiles = list(map(recalculate, paramsArray))

    return jsonify(resultFiles)


def is_safe_path(tokenId, path, follow_symlinks=True):
    # resolves symbolic links
    if follow_symlinks:
        return path.realpath(path).startswith(path.realpath(getInputDir(tokenId)))

    return path.abspath(path).startswith(path.realpath(getInputDir(tokenId)))


if __name__ == '__main__':
    """ Serve application on port 9001 when running locally """

    @app.route('/')
    def index():
        return send_file('index.html')

    app.run('0.0.0.0', port=args.port_number, debug=True)
