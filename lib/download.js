import path from 'path';
import request from 'request-promise';
import { mkdirp, fs } from 'appium-support';

const log = console.log; // eslint-disable-line no-console

const MODEL_URL = "http://localhost:8000/saved_model.pb"; // TODO download from a real host
const MODEL_DIR = path.resolve(__dirname, '..', '..', 'model', 'obj_detection_model');
const MODEL = path.resolve(MODEL_DIR, 'saved_model.pb');

export async function downloadObjDetectionModel (overwrite = false) {
  log(`Will download object detection model from remote host`);
  log(`Checking whether ${MODEL_DIR} exists...`);
  await mkdirp(MODEL_DIR);
  if (await fs.exists(MODEL)) {
    if (!overwrite) {
      log(`${MODEL} already exists, not re-downloading`);
      return;
    }
    log(`Model already exists, will re-download`);
  }

  log(`Downloading model from ${MODEL_URL}...`);
  const body = await request.get({url: MODEL_URL, encoding: 'binary'});
  log(`Writing binary content to ${MODEL}...`);
  await fs.writeFile(MODEL, body, {encoding: 'binary'});
  await fs.chmod(MODEL, 0o0755);
  log(`Download complete`);
}

if (module === require.main) {
  downloadObjDetectionModel(true).catch((err) => { // eslint-disable-line promise/prefer-await-to-callbacks
    log(err.stack); // eslint
    process.exit(1);
  });
}
