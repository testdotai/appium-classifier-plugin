import path from 'path';
import chai from 'chai';
import should from 'should';
import { getModel, tensorFromImage, predictionFromImage,
  DEFAULT_CONFIDENCE_THRESHOLD } from '../lib/classifier';
import { canvasFromImage } from '../lib/image';

const { tfVersion } = require('bindings')('test-ai-classifier');

chai.use(should);

const CART_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "cart.png");
const MIC_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "microphone.png");
const FOLDER_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "folder.png");

describe('Model', function () {
  it('should load the model', async function () {
    await getModel();
  });

  it('should get the tensorflow version', function () {
    tfVersion().should.eql('1.0');
  });

  it('should make predictions based on model', async function () {
    let pred = await predictionFromImage(await canvasFromImage(CART_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "cart");
    pred[0].should.eql("cart");

    pred = await predictionFromImage(await canvasFromImage(MIC_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "microphone");
    pred[0].should.eql("microphone");

    pred = await predictionFromImage(await canvasFromImage(FOLDER_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "folder");
    pred[0].should.eql("unclassified");
  });

  it('should obey a confidence threshold', async function () {
    let pred = await predictionFromImage(await canvasFromImage(CART_IMG), 1, "cart");
    pred[0].should.eql("unclassified");

    pred = await predictionFromImage(await canvasFromImage(FOLDER_IMG), 0.1, "folder");
    pred[0].should.eql("facebook");
  });
});

describe('Image Tensor', function () {
  it('should get a tensor for an image', async function () {
    await tensorFromImage(await canvasFromImage(CART_IMG));
  });
});
