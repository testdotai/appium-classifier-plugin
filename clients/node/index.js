import _ from 'lodash';
import path from 'path';
import grpc from 'grpc';
import B from 'bluebird';

const PROTO = path.resolve(__dirname, '..', 'classifier.proto');

const DEF_HOST = "localhost";
const DEF_PORT = 50051;
const DEF_CONFIDENCE = 0.9;

const QUERY = "//body//*[not(self::script) and not(self::style) and not(child::*)]";


class ClassifierClient {
  constructor ({host = DEF_HOST, port = DEF_PORT}) {
    this.host = host;
    this.port = port;
    const protoLoader = require('@grpc/proto-loader');
    const packageDef = protoLoader.loadSync(PROTO, {
      keepCase: true,
      defaults: true,
      oneofs: true
    });
    const protoDesc = grpc.loadPackageDefinition(packageDef);
    const client = new protoDesc.Classifier(`${this.host}:${this.port}`, grpc.credentials.createInsecure());
    this._classifyElements = B.promisify(client.classifyElements, {context: client});
  }

  async classifyElements ({
    labelHint,
    elementImages,
    confidenceThreshold = DEF_CONFIDENCE,
    allowWeakerMatches = false
  }) {
    const res = await this._classifyElements({labelHint, elementImages, confidenceThreshold, allowWeakerMatches});
    return res.classifications;
  }

  async findElementsMatchingLabel ({
    driver,
    labelHint,
    confidenceThreshold = DEF_CONFIDENCE,
    allowWeakerMatches = false
  }) {
    const els = await driver.$$(QUERY);
    const elementImages = {};
    for (const el of els) {
      try {
        const b64Screen = await el.takeElementScreenshot(el.elementId);
        elementImages[el.elementId] = Buffer.from(b64Screen, 'base64');
      } catch (ign) {}
    }
    if (_.size(elementImages) < 1) {
      throw new Error('Could not find any screenshots for leaf node elements');
    }
    const matched = await this.classifyElements({
      labelHint,
      elementImages,
      confidenceThreshold,
      allowWeakerMatches,
    });

    // return only those elements whose ids ended up in our matched list
    return els.filter(el => _.includes(_.keys(matched), el.elementId));
  }
}

export default ClassifierClient;
export { ClassifierClient };
