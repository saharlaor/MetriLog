const process = require('process');
const winston = require('winston');
const os = require('os');
const utils = require('./utils');

const LOGPATH = utils.check_dir('./logs/tcp_agent/')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `info.log`
    //
    new winston.transports.File({ filename: `${LOGPATH}/error${utils.get_date().split('_')[0]}.log`, level: 'error' }),
    new winston.transports.File({ filename: `${LOGPATH}/info${utils.get_date().split('_')[0]}.log` }),
  ],
});

/** fields needed to be sent from main process:
 *  level of severity - error, warn, info
 *  service name - i.e. log_receiver, log_sender, log_miner
 *  message - the main body
 *  */

process.on("message", (data) => {
  logger.log({
    time: utils.get_date(),
    level: data.level,
    hostname: os.hostname(),
    ip: os.networkInterfaces(),
    service: data.service,
    message: data.message
  });
});