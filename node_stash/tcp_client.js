const net = require('net');
const fs = require('graceful-fs');
const utils = require('./utils');
const cp = require('child_process');

// Constants: port and host to connect to, directory to monitor for files.
const [PORT, SERVER, DIRPATH] = [9000, '127.0.0.1', "./archive/"];
const logging = cp.fork('./logging.js');


/**
 *  This function is the for the dir_walk util .
 *  Each time a file_path returns, this callback function opens a 
 *  connection to the server and sends the data.
 *  Upon the end of the filestreaming, the file will be deleted, as to 
 *  not send it again in the next iteration.
 * @param {String} file_path 
 */
function connect_and_send(file_path) {
    //  A connection to the server is made.
    let client = net.createConnection(PORT, SERVER, () => {
    
        //  The given file path is turned into a readable data stream.
        var fileStream = fs.createReadStream(file_path);

        /*  On the event that the data is ready to be operated,
            it is piped to the client, thus being sent to the server.*/
        fileStream.on('open', () => {
            fileStream.pipe(client);
        });

        /*  If there is an error in making the file into a data stream,
            the error will be logged on-screen.*/
        fileStream.on('error', (err) => {
            logging.send({
                level: "error", 
                message: {
                    function: "createReadStream", 
                    error: err, 
                    note: `Couldn't make ${file_path} into a readstream.`},
                service: "sender"}
            );
            console.log(err);
        });

        /**
         *  When the file is all sent, the client will close its connection
         *  and delete the file.
         */
        fileStream.on("close", () => {
            client.destroy();
            
            fs.unlink(file_path, (err) => {
                if (err) {
                    logging.send({
                        level: "error", 
                        message: {
                            function: "unlink", 
                            error: err, 
                            note: `Couldn't delete file: ${file_path}.\nExecuted after closing the readstream.`},
                        service: "sender"}
                    );
                }
            })
        })
    });

    client.on('error', (err) => {
        logging.send({
            level: "error", 
            message: {
                function: "createConnection", 
                error: err, 
                note: `Connection error to host: ${SERVER} on port: ${PORT}.`},
            service: "sender"}
        );
        console.log(err);
    });
}

// setInterval will call the function every given time, with the last 2 params.
logging.send({level: "info", message: "Sender executed.", service: "sender"});
setInterval(utils.dir_walk, 5000, DIRPATH, connect_and_send);