import _ from 'lodash';
import path from 'path';
import grpc from 'grpc';
import npmlog from 'npmlog';
import { asyncmap } from 'asyncbox';

import { canvasFromImage } from './image';
import { getMatchingElements } from './classifier';

const PROTO = path.resolve(__dirname, '..', '..', 'classifier.proto');
const DEFAULT_PORT = 50051;

const log = new Proxy({}, {
  get (target, name) {
    return function (...args) {
      npmlog[name]('ai-rpc', ...args);
    };
  }
});

export function main (port = DEFAULT_PORT) {
  const server = new grpc.Server();
  const protoLoader = require('@grpc/proto-loader');
  const packageDef = protoLoader.loadSync(PROTO, {
    keepCase: true,
    defaults: true,
    oneofs: true
  });
  const protoDesc = grpc.loadPackageDefinition(packageDef);
  server.addService(protoDesc.Classifier.service, {
    classifyElements
  });
  server.bind(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure());
  server.start();
  log.info(`Server Started on port ${port}`);
  return server;
}

async function classifyElements (call, cb) { // eslint-disable-line promise/prefer-await-to-callbacks
  const {
    labelHint,
    elementImages,
    confidenceThreshold,
    allowWeakerMatches
  } = call.request;
  log.info(`Classifying ${_.size(elementImages)} elements with desired label ${labelHint}`);
  log.info(`Using threshold ${confidenceThreshold}`);
  if (allowWeakerMatches) {
    log.info('Elements whose most likely classification does not match the ' +
             'label hint will be included in the response');
  }

  const classifications = {};
  try {
    // TODO implementation
    const elsAndImages = await asyncmap(_.keys(elementImages), async (k) => {
      return [k, await canvasFromImage(elementImages[k])];
    });
    const matchingEls = await getMatchingElements({
      elsAndImages,
      label: labelHint,
      confidence: confidenceThreshold,
      allowWeakerMatches,
      logger: log,
      returnMetadata: true
    });
    for (const [elId, label, confidenceForHint, confidence] of matchingEls) {
      classifications[elId] = {label, confidenceForHint, confidence};
    }
  } catch (err) {
    return cb(err); // eslint-disable-line promise/prefer-await-to-callbacks
  }

  cb(null, {classifications}); // eslint-disable-line promise/prefer-await-to-callbacks
}

if (module === require.main) {
  main();
}
