import fs from 'fs';
import path from 'path';
import chai from 'chai';
import should from 'should';
import { remote } from 'webdriverio';
import { main } from '../../../../build-js/lib/rpc'; // eslint-disable-line import/no-unresolved
import ClassifierClient from '..';

chai.use(should);

const PORT = 50051;
const HOST = "127.0.0.1";
const FIXTURES = path.resolve(__dirname, "..", "..", "..", "..", "test", "fixtures");
const CART_IMG = path.resolve(FIXTURES, "cart.png");
const MIC_IMG = path.resolve(FIXTURES, "microphone.png");
//const FOLDER_IMG = path.resolve(FIXTURES, "folder.png");
//const MENU_IMG = path.resolve(FIXTURES, "menu.png");
//const TINY_MENU_IMG = path.resolve(FIXTURES, "menu_small.png");

describe('RPC server', function () {
  let server;

  before(function () {
    server = main(HOST, PORT);
  });

  after(function () {
    server.forceShutdown();
  });

  it('should handle requests to classify elements by image', async function () {
    const c = new ClassifierClient({host: HOST, port: PORT});
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

  it('should find elements when given a webdriverio object', async function () {
    const c = new ClassifierClient({host: HOST, port: PORT});
    const driver = await remote({
      host: '127.0.0.1',
      port: 4444,
      capabilities: {
        browserName: 'chrome'
      }
    });
    try {
      await driver.url('https://test.ai');
      const els = await c.findElementsMatchingLabel({
        driver,
        labelHint: 'twitter',
      });
      await els[0].click();
      (await driver.getUrl()).should.eql('https://twitter.com/testdotai');
    } finally {
      await driver.deleteSession();
    }
  });
});
