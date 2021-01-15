tasks
-----

1)  Check if it's better to recursively read a directory with bash inside nodejs.

2)  Add a config file the servers will use for ip and such. (use .env so in prod I'll use env from the os)

3)  Add a cleanup tool.

4)  Should I keep files' original names?

5)  Should use tls!

About logging:
--------------
Both the sender and receiver create a child process responsible for logging.
Should an error occur, the main process will send a message to the logging process.
An example: 
    logging.send({
        level: "error", 
        message: {
            function: "unlink", 
            error: err, 
            note: `Couldn't delete file: ${file_path}.\nExecuted after closing the readstream.`},
        service: "sender"}
    );

The 3 fields (level [error, warn, info], message, service) must be sent because the logger expects them.