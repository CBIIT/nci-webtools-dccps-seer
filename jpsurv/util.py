import os
from configparser import SafeConfigParser
from zipfile import ZipFile, ZIP_DEFLATED


class Util:
    def __init__(self, filename):
        config = SafeConfigParser()
        config.read(filename)

        # Mail settings
        self.MAIL_ADMIN = config.get('mail', 'admin')
        self.MAIL_HOST = config.get('mail', 'host')

        # Folder settings
        self.INPUT_DATA_PATH = config.get('folders', 'input_data_path')
        if not os.path.exists(self.INPUT_DATA_PATH):
            os.makedirs(self.INPUT_DATA_PATH)

        self.OUTPUT_DATA_PATH = config.get('folders', 'output_data_path')
        if not os.path.exists(self.OUTPUT_DATA_PATH):
            os.makedirs(self.OUTPUT_DATA_PATH)

        # App settings
        self.APP_PORT = config.get('jpsurv', 'port')
        self.APP_ROOT = config.get('jpsurv', 'folder.root')
        self.APP_OUT = config.get('jpsurv', 'folder.out')

        # log settings
        self.LOG_SIZE = int(config.get('logs', 'size'))
        self.LOG_ROLLOVER = int(config.get('logs', 'rollover'))

        # S3 settings
        self.INPUT_BUCKET = config.get('s3', 'input_bucket')
        self.OUTPUT_BUCKET = config.get('s3', 'output_bucket')
        self.URL_EXPIRE_TIME = int(config.get('s3', 'url_expire_time'))
        self.S3_INPUT_FOLDER = config.get('s3', 'input_folder')
        self.S3_OUTPUT_FOLDER = config.get('s3', 'output_folder')

        # SQS settings
        self.QUEUE_NAME = config.get('sqs', 'queue_name')
        self.VISIBILITY_TIMEOUT = int(config.get('sqs', 'visibility_timeout'))
        self.QUEUE_LONG_PULL_TIME = int(
            config.get('sqs', 'queue_long_pull_time'))

    def getInputFilePath(self, id):
        return self.getFilePath(self.INPUT_DATA_PATH, id)

    def getOutputFilePath(self, id):
        return self.getFilePath(self.OUTPUT_DATA_PATH, id)

    def getInputFileKey(self, id):
        return (self.S3_INPUT_FOLDER + id)

    def getOutputFileKey(self, id):
        return (self.S3_OUTPUT_FOLDER + id)

    def getFilePath(self, path, id):
        return os.path.join(path + id)

    # compresses targetDirectory into a zip file
    def createArchive(self, targetDirectory):
        rootDir = os.path.basename(targetDirectory)
        try:
            with ZipFile(targetDirectory + '.zip', "w", ZIP_DEFLATED) as archive:
                for dirpath, dirnames, filenames in os.walk(targetDirectory):
                    for filename in filenames:
                        filepath = os.path.join(dirpath, filename)
                        parentpath = os.path.relpath(filepath, targetDirectory)
                        arcname = os.path.join(rootDir, parentpath)
                        archive.write(filepath, arcname)
            return targetDirectory + '.zip'
        except Exception as err:
            return False
