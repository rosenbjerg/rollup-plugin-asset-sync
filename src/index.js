'use strict';
import fs from 'fs';
import path from 'path';

const walkSync = d => fs.statSync(d).isDirectory() ? fs.readdirSync(d).map(f => walkSync(path.join(d, f))) : d;
const fsCopy = fileObj => new Promise((acc, rej) => {
    fs.copyFile(fileObj.in, fileObj.out, err => {
        if (err) rej(err);
        else acc();
    })
});
const fsUnlink = file => new Promise((acc, rej) => {
    fs.unlink(file, err => {
        if (err) rej(err);
        else acc();
    })
});
const flatten = list => list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
const dirOk = (dir, create = false) => {
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

function syncDirs({input, output, debug: verbose}) {
    if (!input || !output) {
        throw new Error("missing input and/or output directory");
    }

    const inputPath = path.resolve(input);
    const outputPath = path.resolve(output);

    if (inputPath === outputPath) {
        throw new Error("the output directory cannot be the same as the input");
    }


    if (!dirOk(inputPath) || !dirOk(outputPath, true)) return;

    const inputFiles = flatten(walkSync(inputPath));
    const outputFiles = flatten(walkSync(outputPath));

    const toCopy = [];
    const toUnlink = [];

    inputFiles.forEach(fIn => {
        const fOut = fIn.replace(inputPath, outputPath);
        if (!outputFiles.includes(fOut)) {
            if (verbose) console.log(`copy: ${fIn}`);
            dirOk(path.dirname(fOut), true);
            return toCopy.push({in: fIn, out: fOut});
        }
        else {
            const fInStat = fs.statSync(fIn);
            const fOutStat = fs.statSync(fOut);
            if (fInStat.mtime !== fOutStat.mtime) {
                if (verbose) console.log(`overwrite: ${fIn}`);
                return toCopy.push({in: fIn, out: fOut});
            }
        }
    });
    outputFiles.forEach(fOut => {
        const fIn = fOut.replace(inputPath, outputPath);
        if (!inputFiles.includes(fIn)) {
            if (verbose) console.log(`unlink: ${fIn}`);

            return toUnlink.push(fOut);
        }
    });
    return Promise.all([
        Promise.all(toCopy.map(fsCopy)),
        Promise.all(toUnlink.map(fsUnlink)),
    ])
}

/**
 * Takes an input and output path for assets, fx. input: src/assets output: dist/assets
 * and syncs the content of the output folder with the input.
 * @param {Object} options The options object.
 * @return {Object} The rollup code object.
 */
export default function sync(options = { }) {
    const defaultOptions = {
        debug: false
    };
    Object.assign(defaultOptions, options);
    return {
        name: 'asset-sync',
        onwrite: () => syncDirs(defaultOptions),
    };
}