import path from 'path';
import request from 'request-promise';
import { mkdirp, fs } from 'appium-support';

const log = console.log; // eslint-disable-line no-console

const MODEL_URL = "https://data.test.ai/appium-plugin/object-detection-model.pb";
const MODEL_MD5 = "365e4be71e9b31ab8408b20e5fb90da6";
const MODEL_DIR = path.resolve(__dirname, '..', '..', 'model', 'obj_detection_model');
const MODEL = path.resolve(MODEL_DIR, 'saved_model.pb');

export async function downloadObjDetectionModel (overwrite = false) {
  log(`Will download object detection model from remote host`);
  log(`Checking whether ${MODEL_DIR} exists...`);
  await mkdirp(MODEL_DIR);
  if (await fs.exists(MODEL)) {
    if ((await fs.md5(MODEL)) === MODEL_MD5) {
      log('Model matches md5 hash, will not re-download');
      return;
    }

    if (!overwrite) {
      log(`${MODEL} already exists and we did not specify overwrite, not re-downloading`);
      return;
    }

    log(`Model already exists, but will re-download`);
  }

  log(`Downloading model from ${MODEL_URL}...`);
  const body = await request.get({url: MODEL_URL, encoding: 'binary'});
  log(`Writing binary content to ${MODEL}...`);
  await fs.writeFile(MODEL, body, {encoding: 'binary'});
  await fs.chmod(MODEL, 0o0755);
  log(`Download complete, verifying hash`);
  const dlMd5 = await fs.md5(MODEL);
  if (dlMd5 === MODEL_MD5) {
    log('Downloaded file content verified');
  } else {
    throw new Error(`Could not verify downloaded file. Downloaded file had ` +
                    `md5 hash ${dlMd5} but we expected ${MODEL_MD5}`);
  }
}

if (module === require.main) {
  downloadObjDetectionModel(true).catch((err) => { // eslint-disable-line promise/prefer-await-to-callbacks
    log(err.stack); // eslint
    process.exit(1);
  });
}
