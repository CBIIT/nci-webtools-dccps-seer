import json
import os
import sys
import rpy2.robjects as robjects
import smtplib
import datetime
import logging

from zipfile import ZipFile
from urllib.parse import unquote
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from rpy2.robjects import r
from logging.handlers import RotatingFileHandler
from jinja2 import Template
from util import Util
from sqs import Queue, VisibilityExtender
from s3 import S3Bucket


def sendMail(recipients, message, config, files=[]):
    if not isinstance(recipients, list):
        recipients = [recipients]
    packet = MIMEMultipart()
    packet['Subject'] = "JPsurv Analysis Results"
    packet['From'] = "JPSurv Analysis Tool <do.not.reply@nih.gov>"
    packet['To'] = ", ".join(recipients)

    logger.info("recipients")
    logger.info(recipients)

    packet.attach(MIMEText(message, 'html'))
    # for file in files:
    #     with open(file, "rb") as openfile:
    #         packet.attach(MIMEApplication(
    #             openfile.read(),
    #             Content_Disposition='attachment; filename="%s"' % os.path.basename(
    #                 file),
    #             Name=os.path.basename(file)
    #         ))
    MAIL_HOST = config.MAIL_HOST
    try:
        logger.info("connecting to mail host: " + MAIL_HOST)
        smtp = smtplib.SMTP(host=MAIL_HOST, timeout=60*10)
        logger.info("connected, attempting to send message")
        smtp.sendmail("do.not.reply@nih.gov",
                      recipients, packet.as_string())
        logger.info("sent message")
        return True
    except Exception as e:
        logger.info("failed to connect to " + MAIL_HOST)
        logger.error('Caught Exception: ' + str(e))
        return False


#  Renders a template given a filepath and template variables
def render_template(filepath, data):
    with open(filepath) as template_file:
        template = Template(template_file.read())
        return template.render(data)


def composeSuccess(WORKING_DIR, jpsurvData, timestamp, logger):
    logger.info('Composing success email')
    jpsurvJSON = os.path.join(WORKING_DIR, jpsurvData)

    with open(jpsurvJSON, 'r') as data:
        jpsurvDataString = data.read()
        data = json.loads(jpsurvDataString)

    token = data['tokenId']

    logger.debug("file name: " + jpsurvData)
    logger.debug("token: " + token)
    logger.debug("jpsurvDataString")
    logger.debug(jpsurvDataString)

    product_name = "JPSurv Analysis Tool"
    url = unquote(data['queue']['url'])
    params = {'product_name': product_name,
              'timestamp': timestamp,
              'url': url
              }

    message = render_template('templates/succ_email.html', params)
    return sendMail(data['queue']['email'], message, config)


def composeFail(WORKING_DIR, jpsurvData, timestamp, logger):
    logger.info('Composing error email')
    jpsurvJSON = os.path.join(WORKING_DIR, jpsurvData)

    with open(jpsurvJSON, 'r') as data:
        jpsurvDataString = data.read()
        data = json.loads(jpsurvDataString)

    token = data['tokenId']

    logger.debug("file name: " + jpsurvData)
    logger.debug("token: " + token)
    logger.debug("jpsurvDataString")
    logger.debug(jpsurvDataString)

    product_name = "JPSurv Analysis Tool"
    if 'data' in data['file']:
        uploadFiles = data['file']['dictionary'] + \
            " " + data['file']['data']
    else:
        uploadFiles = data['file']['dictionary']

    params = {'product_name': product_name,
              'timestamp': timestamp,
              'uploadFiles': uploadFiles
              }

    message = render_template('templates/fail_email.html', params)
    return sendMail(data['queue']['email'], message, config)


def calculate(WORKING_DIR, jpsurvData, timestamp, logger):
    jpsurvJSON = os.path.join(WORKING_DIR, jpsurvData)

    with open(jpsurvJSON, 'r') as data:
        jpsurvDataString = data.read()
        data = json.loads(jpsurvDataString)

        logger.debug("params: " + jpsurvData)
        logger.debug("jpsurvDataString")
        logger.debug(jpsurvDataString)

        try:
            r.source('JPSurvWrapper.R')
            logger.info("Calculating")
            r.getFittedResultWrapper(WORKING_DIR, jpsurvDataString)
            logging.info("Calculation succeeded")
            success = True
        except:
            logging.info("Calculation failed")
            success = False

    return success


def create_rotating_log(config):
    formatter = logging.Formatter('%(asctime)s %(levelname)-8s %(message)s',
                                  '%Y-%m-%d %H:%M:%S')
    time = datetime.datetime.now().strftime("%Y-%m-%d_%H_%M")
    logFile = '../logs/queue.log.' + time

    size = config.LOG_SIZE
    rollover = config.LOG_ROLLOVER

    my_handler = RotatingFileHandler(logFile, mode='a', maxBytes=size,
                                     backupCount=rollover, encoding=None, delay=0)
    my_handler.setFormatter(formatter)
    my_handler.setLevel(logging.DEBUG)

    logger = logging.getLogger('root')
    logger.setLevel(logging.DEBUG)

    logger.addHandler(my_handler)
    return logger


if __name__ == '__main__':
    from argparse import ArgumentParser
    parser = ArgumentParser()
    parser.add_argument('-d', '--debug', action='store_true')
    parser.add_argument('port', nargs='+')
    args = parser.parse_args()
    if (args.debug):
        config = Util('config.dev.ini')
    else:
        config = Util('config.ini')
    logger = create_rotating_log(config)

    try:
        sqs = Queue(logger, config)
        logger.info("JPSurv processor has started")
        while True:
            logger.info("Receiving more messages...")
            for msg in sqs.receiveMsgs():
                extender = None
                try:
                    data = json.loads(msg.body)
                    if data:
                        jobName = 'JPSurv'
                        token = data['jobId']
                        parameters = data['parameters']
                        bucketName = parameters['bucket_name']
                        s3Key = parameters['key']
                        timestamp = parameters['timestamp']
                        jpsurvData = parameters['jpsurvData']

                        bucket = S3Bucket(bucketName, logger)

                        extender = VisibilityExtender(
                            msg, jobName, token, config.VISIBILITY_TIMEOUT, logger)

                        logger.info(
                            'Start processing job name: "{}", token: {} ...'.format(jobName, token))

                        extender.start()

                        saveLoc = os.path.join(config.INPUT_DATA_PATH, token)
                        savePath = os.path.join(config.INPUT_DATA_PATH, f'{token}.zip')
                        WORKING_DIR = os.path.join(os.getcwd(), saveLoc)

                        # download work file archive
                        bucket.downloadFile(s3Key, savePath)

                        # extract work files
                        with ZipFile(savePath) as archive:
                            archive.extractall(config.INPUT_DATA_PATH)

                        job = calculate(WORKING_DIR, jpsurvData,
                                        timestamp, logger)

                        if job:
                            try:
                                # zip and upload to s3 and send email
                                saveLoc = config.createArchive(WORKING_DIR)

                                if saveLoc:
                                    with open(savePath, 'rb') as archive:
                                        object = bucket.uploadFileObj(
                                            config.getInputFileKey(f'{token}.zip'), archive)
                                        if object:
                                            logger.info(f'Succesfully Uploaded {token}.zip')
                                        else:
                                            logger.error(f'Failed to upload {token}.zip')

                                    composeSuccess(
                                        WORKING_DIR, jpsurvData, timestamp, logger)

                            except Exception as err:
                                logger.error(f'Failed to upload {token}.zip')
                                composeFail(WORKING_DIR, jpsurvData,
                                            timestamp, logger)

                        else:
                            composeFail(WORKING_DIR, jpsurvData,
                                        timestamp, logger)

                        msg.delete()
                        logger.info(f'Finish processing job name: {jobName}, token: {token} !')
                    else:
                        logger.debug(data)
                        logger.error('Unknown message type!')
                        msg.delete()
                except Exception as e:
                    logger.exception(e)

                finally:
                    if extender:
                        extender.stop()
    except KeyboardInterrupt:
        logger.info("\nBye!")
        sys.exit()
