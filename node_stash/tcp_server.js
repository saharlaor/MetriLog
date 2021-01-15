const fs = require("graceful-fs");
const net = require("net");
const utils = require("./utils")
const cp = require('child_process');

const [IP, PORT] = ['0.0.0.0', 9000]
const logging = cp.fork('./logging.js');

/*
    This tcp server is meant to receive files.
*/

/*  First an instance is created. Since nodejs is event-driven,
    a callback function is assigned to the event of 
    a connection being made to the server. */
let server = net.createServer();
server.on('connection', handleConn);

/**
 * Upon being called, this function will append the received data 
 * into a generated file.
 * @param {net.Socket} conn 
 */
function handleConn(conn){
    let [fulldate, ip] = [ 
        utils.get_date(),
        conn.remoteAddress.split(":")
    ]
    /*  Checks if the given dir exists (and creates it if it doesn't).
        Returns the same string it was given, for later use.
        Then a path to the generated file is declared.
    */
    try {
        var path = utils.check_dir(`./logs/${ip[ip.length - 1]}`);   
    } catch (err) {
        logging.send({
            level: "error", 
            message: {
                function: "utils_check_dir", 
                error:err, 
                note: "Executed at the beginning of handleConn."}, 
            service: "receiver"});
        throw err;
    }
    var file_path = `${path}/${ip[ip.length - 1]}_${fulldate}${Math.random()}.json`
    
    //  Callback functions are assigned to the different events possible.
    conn.on('data', onConnData);  
    conn.once('close', onConnClose);  
    conn.on('error', onConnError);
    
    /**
     *  Upon data receiving event this function is called.
     *  It will append the data into the file path generated above.
     * @param {Buffer} data 
     */
    function onConnData(data){
        fs.appendFile(file_path, data, function (err) {
            if (err) logging.send({
                level: "error", 
                message: {
                    function: "appendFile",
                    error: err,
                    note: `Couldn't append/create ${file_path}.\nExecuted in onConnData.`}, 
                service: "receiver"});
        });
    }

    /**
     *  Might be implemented later.
     */
    function onConnClose(){
        /*
        logging.send({
            level: "info", 
            message: `Finished writing log: ${file_path}.`, 
            service: "receiver"})
        */
    }

    /**
     *  Upon error event, the server will attempt to close the connection.
     *  It will then log the error onscreen.
     * @param {Error} err 
     */
    function onConnError(err){
        conn.destroy()
        let remoteAddress = conn.remoteAddress + ':' + conn.remotePort;  
        console.log(`${remoteAddress} connection error\nWith error: ${err}`)
        logging.send({
            level: "error", 
            message: {
                function: "onConnError", 
                error: err, 
                note: `Connection error with client ${remoteAddress}.\nConnection destroyed`},
            service: "receiver"});
    }
}

// Start the server, and listen on the given port.
server.listen(PORT, IP, () => {
    msg = `Receiver started listening on IP: ${IP}, PORT: ${PORT}.`
    logging.send({level: "info", message: msg, service: "receiver"})
    console.log(msg)
});