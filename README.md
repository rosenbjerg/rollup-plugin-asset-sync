### rollup-plugin-asset-sync
##### Plugin for rollup that adds asset synchronization.

The plugin copies all files found in the input directory into the output directory.
Files are only overwritten if the last modified time of the two files are different.
Files in the output directory are deleted when they are deleted in the input directory.

The aim is to keep the content of the output directory synced with the input directory, without unnecessary writes.


Requires an options object that specifies the path to the input asset folder and the path of the output asset folder.

Example use in `rollup.config.js`:

```
import assetSync from 'rollup-plugin-asset-sync';

export default {
    input: entry,
    output: {
        file: 'dist/bundle.js',
        format: 'iife',
        sourcemap: true
    },
    plugins: [
        assetSync({
            input: 'src/assets',
            output: 'dist/assets'
        })
    ]
}
```

Tested on Node.js v. 10.8.0 and Rollup v. 0.62.0
