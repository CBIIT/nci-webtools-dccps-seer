import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";

export async function processMessages({
  sqs,
  queueName,
  visibilityTimeout = 30,
  waitTime = 20,
  pollInterval = 20,
  messageHandler,
  messageParser = JSON.parse,
  errorHandler = console.error,
}) {
  const args = {
    sqs,
    queueName,
    visibilityTimeout,
    waitTime,
    pollInterval,
    messageHandler,
    messageParser,
    errorHandler,
  };

  try {
    await processMessage(args)
  } catch (exception) {
    errorHandler(exception);
  } finally {
    setTimeout(
      () => processMessages(args), 
      pollInterval * 1000
    );
  }
}

export async function processMessage({
  sqs,
  queueName,
  visibilityTimeout = 30,
  waitTime = 20,
  messageHandler,
  messageParser = JSON.parse,
  errorHandler = console.error,
}) {
  try {
    const { QueueUrl: queueUrl } = await sqs.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );

    // to simplify running multiple workers in parallel,
    // fetch one message at a time
    const data = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        VisibilityTimeout: visibilityTimeout,
        WaitTimeSeconds: waitTime,
      }),
    );

    if (data.Messages && data.Messages.length > 0) {
      const message = data.Messages[0];
      const messageBody = messageParser(message.Body);

      // while processing is not complete, update the message's visibilityTimeout
      const intervalId = setInterval(async () => {
        await sqs.send(
          new ChangeMessageVisibilityCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
            VisibilityTimeout: visibilityTimeout,
          }),
        );
      }, 1000 * (visibilityTimeout / 2));

      try {
        await messageHandler(messageBody);
      } catch (e) {
        await errorHandler(e, message);
      } finally {
        // remove original message from queue/bucket once processed
        clearInterval(intervalId);
        await sqs.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }
    }
  } catch (e) {
    await errorHandler(e);
  }
}