Overview
--------

This is a client and server based on tcp, the client monitors a folder and sends the files in it to the server. Built to send logs to the monitoring server.

tasks
-----

1)  Add a cleanup tool.

2)  Should use tls!

About logging:
--------------
Both the sender and receiver create a child process responsible for logging.
Should an error occur, the main process will send a message to the logging process.
An example
    logging.send({
        level: "error", 
        message: {
            function: "unlink", 
            error: err, 
            note: `Couldn't delete file: ${file_path}.\nExecuted after closing the readstream.`},
        service: "sender"}
    );

The 3 fields (level [error, warn, info], message, service) must be sent because the logger expects them.

About env:
----------
Parameters the client and server use. 
They can be given in the system, or in a .env file in the folder the app is running from.
If one of the env variables is undefined or empty, an error will be thrown.
Variables:
    Server Parameters
        SRV_IP=0.0.0.0
        PORT=9000
        INCOMING_FOLDER=./logs


    Client Parameters
        IP_TO=127.0.0.1
        PORT_TO=9000
        OUTGOING_FOLDER=./archive

