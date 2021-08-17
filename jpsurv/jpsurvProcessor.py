import json
import os
import sys
import rpy2.robjects as robjects
import datetime
import logging

from os import path, getcwd
from zipfile import ZipFile
from werkzeug.security import safe_join
from urllib.parse import unquote
from rpy2.robjects import r
from utils import createArchive, read_config, create_rotating_log, send_mail, render_template, make_dirs
from sqs import Queue, VisibilityExtender
from s3 import S3Bucket


def composeSuccess(WORKING_DIR, jpsurvData, timestamp, logger, config):
    logger.info('Composing success email')
    jpsurvJSON = path.join(WORKING_DIR, jpsurvData)

    with open(jpsurvJSON, 'r') as data:
        jpsurvDataString = data.read()
        jpsurvJSON = json.loads(jpsurvDataString)

    send_mail(
        host=config['mail']['host'],
        sender=config['mail']['sender'],
        recipient=jpsurvJSON['queue']['email'],
        subject='JPSurv - Your job has been processed',
        contents=render_template(
            'templates/user_email.html', {
                'timestamp': timestamp,
                'url': unquote(jpsurvJSON['queue']['url']),
                'adminSupport': config['mail']['adminSupport']
            }
        )
    )


def composeFail(WORKING_DIR, jpsurvData, timestamp, logger, config):
    logger.info('Composing error email')
    jpsurvJSON = path.join(WORKING_DIR, jpsurvData)

    with open(jpsurvJSON, 'r') as data:
        jpsurvDataString = data.read()
        jpsurvJSON = json.loads(jpsurvDataString)

    if 'data' in jpsurvJSON['file']:
        uploadFiles = jpsurvJSON['file']['dictionary'] + \
            " " + jpsurvJSON['file']['data']
    else:
        uploadFiles = jpsurvJSON['file']['dictionary']

    send_mail(
        host=config['mail']['host'],
        sender=config['mail']['sender'],
        recipient=jpsurvJSON['queue']['email'],
        subject='JPSurv - An error occurred while processing your job',
        contents=render_template(
            'templates/user_error_email.html', {
                'timestamp': timestamp,
                'uploadFiles': uploadFiles,
                'adminSupport': config['mail']['adminSupport']
            }
        )
    )


def calculate(WORKING_DIR, jpsurvData, timestamp, logger):
    jpsurvJSON = path.join(WORKING_DIR, jpsurvData)

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


if __name__ == '__main__':
    config = read_config('../config/config.ini')
    logger = create_rotating_log('jpsurvProcessor', config)
    make_dirs(config['folders']['input_dir'])

    try:
        sqs = Queue(logger, config)
        logger.info("JPSurv processor has started")
        while True:
            for msg in sqs.receiveMsgs():
                extender = None
                try:
                    params = json.loads(msg.body)
                    if params:
                        # specify params
                        jobName = 'JPSurv'
                        token = params['jobId']
                        timestamp = params['timestamp']
                        jpsurvData = params['jpsurvData']

                        s3Key = path.join(
                            config['s3']['input_dir'], f'{token}.zip')
                        bucket = S3Bucket(config['s3']['bucket'], logger)

                        extender = VisibilityExtender(
                            msg, jobName, token, int(config['sqs']['visibility_timeout']), logger)

                        logger.info(
                            'Start processing job name: "{}", token: {} ...'.format(jobName, token))

                        extender.start()

                        # specify paths
                        input_dir = config['folders']['input_dir']
                        input_archive_path = path.join(
                            config['folders']['input_dir'], f'{token}.zip')
                        WORKING_DIR = path.join(getcwd(), input_dir, token)

                        # download work file archive
                        bucket.downloadFile(s3Key, input_archive_path)

                        # extract work files
                        with ZipFile(input_archive_path) as archive:
                            archive.extractall(input_dir)

                        job = calculate(WORKING_DIR, jpsurvData,
                                        timestamp, logger)

                        if job:
                            try:
                                # zip and upload to s3 and send email
                                output_dir_archive = createArchive(
                                    WORKING_DIR)

                                if output_dir_archive:
                                    with open(input_archive_path, 'rb') as archive:
                                        object = bucket.uploadFileObj(
                                            path.join(config['s3']['output_dir'], f'{token}.zip'), archive)
                                        if object:
                                            logger.info(
                                                f'Succesfully Uploaded {token}.zip')
                                        else:
                                            logger.error(
                                                f'Failed to upload {token}.zip')

                                    composeSuccess(
                                        WORKING_DIR, jpsurvData, timestamp, logger, config)

                            except Exception as err:
                                logger.error(f'Failed to upload {token}.zip')
                                composeFail(WORKING_DIR, jpsurvData,
                                            timestamp, logger, config)

                        else:
                            composeFail(WORKING_DIR, jpsurvData,
                                        timestamp, logger, config)

                        msg.delete()
                        logger.info(
                            f'Finish processing token: {token}')
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
    except Exception as e:
        logger.exception(e)
        logger.error('Failed to connect to SQS queue')
