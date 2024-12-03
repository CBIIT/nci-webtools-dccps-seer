import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export async function getFile(key, config) {
  const s3 = new S3Client({ region: config.sqs.region });
  const params = { Bucket: config.s3.bucket, Key: key };
  const savePath = path.join(config.folders.input_dir, path.basename(key));
  // Get the object from the Amazon S3 bucket. It is returned as a ReadableStream.
  const { Body } = await s3.send(new GetObjectCommand(params));

  return writeStream(savePath, Body);
}

export async function deleteFile(key, config) {
  const s3 = new S3Client({ region: config.sqs.region });
  const params = {
    Bucket: config.s3.bucket,
    Key: key,
  };
  return await s3.send(new DeleteObjectCommand(params));
}

export async function putFile(buffer, key, config) {
  const s3 = new S3Client({ region: config.sqs.region });
  const params = {
    Bucket: config.s3.bucket,
    Key: key,
    Body: buffer,
  };
  return await s3.send(new PutObjectCommand(params));
}

function writeStream(path, stream) {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(path);
    writer.on('finish', () => resolve(path));
    writer.on('error', reject);
    stream.pipe(writer);
  });
}
