import path from 'path';
import grpc from 'grpc';
import B from 'bluebird';

const PROTO = path.resolve(__dirname, '..', 'classifier.proto');

const DEF_HOST = "localhost";
const DEF_PORT = 50051;
const DEF_CONFIDENCE = 0.9;


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
}

export default ClassifierClient;
export { ClassifierClient };
