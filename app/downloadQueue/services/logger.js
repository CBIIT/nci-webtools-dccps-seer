import path from 'path';
import util from 'util';
import fs from 'fs';
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

export function getLogger(name, config) {
  const { folder, level } = config;
  fs.mkdirSync(folder, { recursive: true });

  return new createLogger({
    level: level || 'info',
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.label({ label: name }),
      format.printf(({ label, timestamp, level, message }) =>
        [
          [label, process.pid, timestamp, level].map((s) => `[${s}]`).join(' '),
          util.format(message),
        ].join(' - ')
      )
    ),
    transports: [
      new transports.Console(),
      new transports.DailyRotateFile({
        filename: path.resolve(folder, `${name}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: false,
        maxSize: '1024m',
        timestamp: true,
        maxFiles: '1d',
        prepend: true,
      }),
    ],
    exitOnError: false,
  });
}
