#! /usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable promise/prefer-await-to-then */
/* eslint-disable promise/prefer-await-to-callbacks */

const path = require('path');
const fs = require('fs');
const DOWNLOAD_JS = path.resolve(__dirname, 'build-js', 'lib', 'download.js');

if (module === require.main) {
  if (fs.existsSync(DOWNLOAD_JS)) {
    require(DOWNLOAD_JS).downloadObjDetectionModel().catch((err) => {
      console.error(err.stack);
      console.error("WARN: Download of object detection model failed. Object " +
                    "detection mode will not work.");
    });
  } else {
    console.error("Not downloading object detection model because built code " +
                  "doesn't exist. First run `npm run build` and then " +
                  "`./postinstall.js`");
  }
}
