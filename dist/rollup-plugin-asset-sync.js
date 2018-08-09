'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));

var walkSync = function (d) { return fs.statSync(d).isDirectory() ? fs.readdirSync(d).map(function (f) { return walkSync(path.join(d, f)); }) : d; };
var fsCopy = function (fileObj) { return new Promise(function (acc, rej) {
    fs.copyFile(fileObj.in, fileObj.out, function (err) {
        if (err) { rej(err); }
        else { acc(); }
    });
}); };
var fsUnlink = function (file) { return new Promise(function (acc, rej) {
    fs.unlink(file, function (err) {
        if (err) { rej(err); }
        else { acc(); }
    });
}); };

var dirOk = function (dir, create) {
    if ( create === void 0 ) create = false;

    try {
        fs.statSync(dir);
        return true;
    }
    catch (e) {
        if (create) {
            fs.mkdirSync(dir);
            return true;
        }
        return false;
    }
};

function syncDirs(input, output) {
    if (!input || !output) {
        throw new Error("missing input and/or output directory");
    }

    var inputPath = path.resolve(input);
    var outputPath = path.resolve(output);

    if (inputPath === outputPath) {
        throw new Error("the output directory cannot be the same as the input");
    }


    if (!dirOk(inputPath) || !dirOk(outputPath, true)) { return; }

    var inputFiles = walkSync(inputPath);
    var outputFiles = walkSync(outputPath);

    var toCopy = [];
    var toUnlink = [];

    inputFiles.forEach(function (fIn) {
        var fOut = fIn.replace(inputPath, outputPath);
        if (!outputFiles.includes(fOut)) {
            return toCopy.push({in: fIn, out: fOut});
        }
        else {
            var fInStat = fs.statSync(fIn);
            var fOutStat = fs.statSync(fOut);
            if (fInStat.mtime !== fOutStat.mtime) {
                return toCopy.push({in: fIn, out: fOut});
            }
        }
    });
    outputFiles.forEach(function (fOut) {
        var fIn = fOut.replace(inputPath, outputPath);
        if (!inputFiles.includes(fIn)) {
            return toUnlink.push(fOut);
        }
    });
    return Promise.all([
        Promise.all(toCopy.map(fsCopy)),
        Promise.all(toUnlink.map(fsUnlink)) ])
}

/**
 * Takes an input and output path for assets, fx. input: src/assets output: dist/assets
 * and syncs the content of the output folder with the input.
 * @param {Object} options The options object.
 * @return {Object} The rollup code object.
 */
function sync(options) {
    if ( options === void 0 ) options = { };

    var input = options.input;
    var output = options.output;
    return {
        name: 'asset-sync',
        onwrite: function () { return syncDirs(input, output); },
    };
}

module.exports = sync;
