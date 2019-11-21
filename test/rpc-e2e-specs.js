import fs from 'fs';
import path from 'path';
import chai from 'chai';
import should from 'should';
import { main } from '../lib/rpc';
import ClassifierClient from '../../clients/node/build'; // eslint-disable-line import/no-unresolved

chai.use(should);

const PORT = 50051;
const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
const CART_IMG = path.resolve(FIXTURES, "cart.png");
//const MIC_IMG = path.resolve(FIXTURES, "microphone.png");
//const FOLDER_IMG = path.resolve(FIXTURES, "folder.png");
//const MENU_IMG = path.resolve(FIXTURES, "menu.png");
//const TINY_MENU_IMG = path.resolve(FIXTURES, "menu_small.png");

describe('RPC server', function () {
  let server;

  before(function () {
    server = main(PORT);
  });

  after(function () {
    server.forceShutdown();
  });

  it('should handle requests to classify elements by image', async function () {
    const c = new ClassifierClient({port: PORT});
    const elId = '1234-134';
    const input = {
      labelHint: 'cart',
      elementImages: {
        [elId]: fs.readFileSync(CART_IMG)
      },
    };
    const res = await c.classifyElements(input);
    res[elId].label.should.eql('cart');
    res[elId].confidence.should.be.above(0.9);
    res[elId].confidence.should.be.below(1.0);
    res[elId].confidenceForHint.should.be.above(0.9);
    res[elId].confidenceForHint.should.be.below(1.0);
  });
});
