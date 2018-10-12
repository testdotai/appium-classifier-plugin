import path from 'path';
import chai from 'chai';
import should from 'should';
import { getModel, tensorFromImage, predictionFromImage } from '../lib/classifier';
import { canvasFromImage } from '../lib/image';

chai.use(should);

const CART_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "cart.png");
const MIC_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "microphone.png");
const FOLDER_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "folder.png");

describe('Model', function () {
  it('should load the model', async function () {
    await getModel();
  });

  it('should make predictions based on model', async function () {
    let pred = await predictionFromImage(await canvasFromImage(CART_IMG));
    pred.should.eql("cart");

    pred = await predictionFromImage(await canvasFromImage(MIC_IMG));
    pred.should.eql("microphone");

    pred = await predictionFromImage(await canvasFromImage(FOLDER_IMG));
    pred.should.eql("unclassified");
  });
});

describe('Image Tensor', function () {
  it('should get a tensor for an image', async function () {
    await tensorFromImage(await canvasFromImage(CART_IMG));
  });
});
