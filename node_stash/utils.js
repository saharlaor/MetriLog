const fs = require ("fs");
const path = require("path");

/**
 *  This function creates given path if needed, returns it as a string.
 * @param {String} path 
 */
exports.check_dir = (path) => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path,{recursive: true})
    };
    return path
}
/**
 *  Returns a string of the full current date and time.
 */
exports.get_date = () => {
    let date = new Date();
    let [year, month, day, hour, minute, second] = 
        [date.getFullYear(), ("0" + (date.getMonth() + 1)).slice(-2),
        ("0" + date.getDate()).slice(-2), date.getHours(),
        date.getMinutes(), date.getSeconds()];
    let fulldate = day + "-" + month + "-" + year + "_" + hour + "-" + minute + "-" + second;
    return fulldate;
}
/**
 *  This function runs over every object in the given directory.
 *  If the object is a folder, the function will execute itself again on the object.
 *  If the object is a file, the callback function will be executed, 
 *  with the file path as a parameter.
 * @param {String} dir_path 
 * @param {Function} callback 
 */
exports.dir_walk = function dir_walk(dir_path, callback) {
    fs.readdir(dir_path, (err, files) => {
        if (err) { throw err };
        files.forEach(file => {
            var full_path = path.join(dir_path, file);
            fs.stat(full_path, (err, stats) => {
                if (stats.isDirectory()){
                    dir_walk(full_path, callback)
                }
                else if (stats.isFile()){
                    callback(full_path, stats)
                }

            });
        });

    });
}