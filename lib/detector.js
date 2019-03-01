import path from 'path';

// need to initialize tfjs before calling the classifier bindings, otherwise it
// cannot find the tf c lib
import '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

const { TF_VERSION, detect: _detect } = require('bindings')('test-ai-classifier');

const MODEL = path.resolve(__dirname, "..", "..", "model", "obj_detection_model");

function detect (imgPath, confidence = 0.95, debug = false) {
  return _detect(MODEL, imgPath, confidence, debug);
}

export { TF_VERSION, detect };
