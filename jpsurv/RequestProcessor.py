import json
import math
import os
import rpy2.robjects as robjects
import smtplib
import time
import logging

from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from twisted.internet import reactor, defer
from PropertyUtil import PropertyUtil
from stompest.async import Stomp
from stompest.async.listener import SubscriptionListener
from stompest.async.listener import DisconnectListener
from stompest.config import StompConfig
from stompest.protocol import StompSpec

class RequestProcessor(DisconnectListener):
  CONFIG = 'queue.config'
  NAME = 'queue.name'
  URL = 'queue.url'
  MAIL_HOST = 'mailfwd.nih.gov'
  MAIL_ADMIN = 'pansu@mail.nih.gov'

  def composeMail(self,recipients,message,files=[]):
    print "sending message"
    if not isinstance(recipients,list):
      recipients = [recipients]
    packet = MIMEMultipart()
    packet['Subject'] = "Subject: JPsurv Analysis Results"
    packet['From'] = "JPSurv Analysis Tool <do.not.reply@nih.gov>"
    packet['To'] = ", ".join(recipients)
    print recipients
    packet.attach(MIMEText(message,'html'))
    for file in files:
      with open(file,"rb") as openfile:
        packet.attach(MIMEApplication(
          openfile.read(),
          Content_Disposition='attachment; filename="%s"' % os.path.basename(file),
          Name=os.path.basename(file)
        ))
    smtp = smtplib.SMTP(RequestProcessor.MAIL_HOST)
    smtp.sendmail("do.not.reply@nih.gov",recipients,packet.as_string())

  def testQueue(self):
    print("tested")

  def rLength(self, tested):
    if tested is None:
      return 0
    if isinstance(tested,list) or isinstance(tested,set):
      return len(tested)
    else:
      return 1

 # @This is teh consume code which will listen to Queue server.
  def consume(self, client, frame):
    print "In consume"
    files=[]

    parameters = json.loads(frame.body)
    print parameters
    token=parameters['token']
    filepath=parameters['filepath']
    timestamp=['timestamp']

    print token
    fname=filepath+"/input_"+token+".json"
    print fname
    with open(fname) as content_file:
      jpsurvDataString = content_file.read()

    data=json.loads(jpsurvDataString)

    rSource = robjects.r['source']('JPSurvWrapper.R')
    robjects.r['getFittedResultWrapper'](parameters['filepath'], jpsurvDataString)
    robjects.r['getAllData'](parameters['filepath'], jpsurvDataString)
    print "Calculating"
    print "making message"

#    rSource('./JPSurvWrapper.R')
#    getFittedResultWrapper = robjects.globalenv['getFittedResultWrapper']
   # print parameters['data']
    #http://analysistools-dev.nci.nih.gov/jpsurv/?file_control_filename=Breast_RelativeSurvival.dic&file_data_filename=Breast_RelativeSurvival.txt&output_filename=form-766756.json&status=uploaded&tokenId=766756

    Link='<a href='+data['queue']['url']+'> Here </a>' 
    print parameters['timestamp']
    print Link
    message = """
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <title>html title</title>
      </head>
      <body>
        <p>Dear User<br/> We have analyzed your data created on """+parameters['timestamp']+""" using JPSurv.<br />
        You can view your results: """+Link+"""<br />
         This link will expire two weeks from today.<br /><br /><br />
         - JPSurv Team<br />
         (Note:  Please do not reply to this email. If you need assistance, please contact pansu@mail.nih.gov)
      </body>
      """
          #    "\r\n\r\n - JPSurv Team\r\n(Note:  Please do not reply to this email. If you need assistance, please contact xxxx@mail.nih.gov)"+
          #    "\n\n")
    print message
    print "sending"
    self.composeMail(data['queue']['email'],message,files)
    print "end"
  
  @defer.inlineCallbacks
  def run(self):
    client = yield Stomp(self.config).connect()
    headers = {
        # client-individual mode is necessary for concurrent processing
        # (requires ActiveMQ >= 5.2)
        StompSpec.ACK_HEADER: StompSpec.ACK_CLIENT_INDIVIDUAL,
        # the maximal number of messages the broker will let you work on at the same time
        'activemq.prefetchSize': '100',
    }
    client.subscribe(self.QUEUE, headers, listener=SubscriptionListener(self.consume, errorDestination=self.ERROR_QUEUE))
    client.add(listener=self)

  # Consumer for Jobs in Queue, needs to be rewrite by the individual projects

  def onCleanup(self, connect):
    print 'In clean up ...'
  
  def onConnectionLost(self, connect, reason):
    print "in onConnectionLost"
    self.run()

 # @read from property file to set up parameters for the queue.
  def __init__(self):
    config = PropertyUtil(r"config.ini")
     # Initialize Connections to ActiveMQ
    self.QUEUE=config.getAsString(RequestProcessor.NAME)
    self.ERROR_QUEUE=config.getAsString('queue.error.name')
    config = StompConfig(config.getAsString(RequestProcessor.URL)) 
    self.config = config

if __name__ == '__main__':
  logging.basicConfig(level=logging.INFO)
  RequestProcessor().run()
  reactor.run()
