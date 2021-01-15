const fs = require("graceful-fs");
const net = require("net");
const utils = require("./utils")
const cp = require('child_process');

const logging = cp.fork('./logging.js');


// load constants from .env, if one exists.
if (fs.readdirSync('./').includes('.env')) {
    require('dotenv').config();
}
const [IP, PORT, incoming_folder] = [
    process.env.SRV_IP, 
    Number(process.env.PORT),
    process.env.INCOMING_FOLDER    
];
if ([PORT, IP, incoming_folder].includes(undefined) 
    || [PORT, IP, incoming_folder].includes('') 
    || [PORT, IP, incoming_folder].includes(NaN)) 
    {
        logging.send({
            level: "error", 
            message: {
                error: 'Malformed environment variables, check README.MD', 
            },
            service: "receiver"}
        );
        throw Error('Malformed environment variables, check README.MD');
}

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
    let ip = conn.remoteAddress.split(":");
    
    /*  Checks if the given dir exists (and creates it if it doesn't).
        Returns the same string it was given, for later use.
        Then a path to the generated file is declared.
    */
    try {
        var path = utils.check_dir(`${incoming_folder}/${ip[ip.length - 1]}`);   
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
    //var file_path = `${path}/${ip[ip.length - 1]}_${fulldate}${Math.random()}.json`
    
    //  Callback functions are assigned to the different events possible.
    /** To keep the name of a file, it wil be first sent alone.
     *  Thus, the event listener is first ONCE, and then registers an ON.
     *  It keeps the filename and binds it to the listener that will append data into it.
     *  It will rewrite the file at the beginning of the 
     *  connection in case the same file is sent twice.
     *  As to not mix files.
     */
    conn.once("data", (data) => {
        var base_name = {file_path: `${path}/${data}`};
        fs.writeFile(base_name.file_path,"");
        var onConnData = fileAppender.bind(base_name);
        conn.on('data', onConnData);
    });
    conn.once('close', onConnClose);  
    conn.on('error', onConnError);
    
    /**
     *  Upon data receiving event this function is called.
     *  It will append the data into the file path generated above.
     * @param {Buffer} data 
     */
    function fileAppender(data){
        fs.appendFile(this.file_path, data, function (err) {
            if (err) logging.send({
                level: "error", 
                message: {
                    function: "appendFile",
                    error: err,
                    note: `Couldn't append/create ${this.file_path}.\nExecuted in fileAppender.`}, 
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
     *  It will then log the error, while also displaying it onscreen.
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