'use strict';
import fs from 'fs';
import path from 'path';

const walkSync = (d) => fs.statSync(d).isDirectory() ? fs.readdirSync(d).map(f => walkSync(path.join(d, f))) : d;
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

function syncDirs(input, output) {
    if (!input || !output) {
        throw new Error("missing input and/or output directory");
    }

    const inputPath = path.resolve(input);
    const outputPath = path.resolve(output);

    if (inputPath === outputPath) {
        throw new Error("the output directory cannot be the same as the input");
    }


    if (!dirOk(inputPath) || !dirOk(outputPath, true)) return;

    const inputFiles = walkSync(inputPath);
    const outputFiles = walkSync(outputPath);

    const toCopy = [];
    const toUnlink = [];

    inputFiles.forEach(fIn => {
        const fOut = fIn.replace(inputPath, outputPath);
        if (!outputFiles.includes(fOut)) {
            return toCopy.push({in: fIn, out: fOut});
        }
        else {
            const fInStat = fs.statSync(fIn);
            const fOutStat = fs.statSync(fOut);
            if (fInStat.mtime !== fOutStat.mtime) {
                return toCopy.push({in: fIn, out: fOut});
            }
        }
    });
    outputFiles.forEach(fOut => {
        const fIn = fOut.replace(inputPath, outputPath);
        if (!inputFiles.includes(fIn)) {
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
    const { input, output } = options;
    return {
        name: 'asset-sync',
        onwrite: () => syncDirs(input, output),
    };
}