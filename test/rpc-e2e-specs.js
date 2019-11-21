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
const MIC_IMG = path.resolve(FIXTURES, "microphone.png");
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
    const input = {
      labelHint: 'cart',
      elementImages: {
        cart: fs.readFileSync(CART_IMG),
        mic: fs.readFileSync(MIC_IMG)
      },
      confidenceThreshold: 0.0,
      allowWeakerMatches: true
    };
    const res = await c.classifyElements(input);
    res.cart.label.should.eql('cart');
    res.cart.confidence.should.be.above(0.9);
    res.cart.confidence.should.be.below(1.0);
    res.cart.confidenceForHint.should.be.above(0.9);
    res.cart.confidenceForHint.should.be.below(1.0);

    res.mic.label.should.eql('microphone');
    res.mic.confidence.should.be.above(0.2);
    res.mic.confidence.should.be.below(1.0);
    res.mic.confidenceForHint.should.be.above(0.0);
    res.mic.confidenceForHint.should.be.below(0.2);
  });
});
