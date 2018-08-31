'use strict';
import fs from 'fs';
import path from 'path';

const walk = (p, accumulator = []) => {
    if (fs.statSync(p).isDirectory()) {
        fs.readdirSync(p).forEach(subPath => walk(path.join(p, subPath), accumulator));
    }
    else {
        accumulator.push(p);
    }
    return accumulator;
};

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

const mtimeEqual = (t1, t2) => !(t1 < t2 || t1 > t2);

function syncDirs({input, output, verbose}) {
    if (!input || !output) {
        throw new Error("missing input and/or output directory");
    }

    const inputPath = path.normalize(input);
    const outputPath = path.normalize(output);

    if (inputPath === outputPath) {
        throw new Error("the output directory cannot be the same as the input");
    }


    if (!dirOk(inputPath) || !dirOk(outputPath, true)) return;

    const inputFiles = walk(inputPath).map(f => path.resolve(f));
    const outputFiles = walk(outputPath).map(f => path.resolve(f));

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
            if (!mtimeEqual(fInStat.mtime, fOutStat.mtime)) {
                if (verbose) console.log(`overwrite: ${fIn}`);
                return toCopy.push({in: fIn, out: fOut});
            }
        }
    });
    outputFiles.forEach(fOut => {
        const fIn = fOut.replace(outputPath, inputPath);
        if (!inputFiles.includes(fIn)) {
            if (verbose) console.log(`unlink: ${fIn}`);
            return toUnlink.push(fOut);
        }
    });
    return Promise.all([
        Promise.all(toCopy.map(fsCopy)).catch(err => verbose && console.log('could not copy', err)),
        Promise.all(toUnlink.map(fsUnlink)).catch(err => verbose && console.log('could not unlink', err))
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
        verbose: false
    };
    Object.assign(defaultOptions, options);
    return {
        name: 'asset-sync',
        onwrite: () => syncDirs(defaultOptions),
    };
}