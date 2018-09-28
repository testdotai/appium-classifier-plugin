import path from 'path';
import chai from 'chai';
import should from 'should';
import { getModel, canvasFromImage, tensorFromImage, predictionFromImage } from '../lib/classifier';

chai.use(should);

const TEST_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "image.png");
const MIC_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "microphone.png");

describe('Model', function () {
  it('should load the model', async function () {
    await getModel();
  });

  it('should make predictions based on model', async function () {
    let pred = await predictionFromImage(await canvasFromImage(TEST_IMG));
    pred.should.eql("cart");

    pred = await predictionFromImage(await canvasFromImage(MIC_IMG));
    pred.should.eql("microphone");
  });
});

describe('Image Tensor', function () {
  it('should get a tensor for an image', async function () {
    await tensorFromImage(await canvasFromImage(TEST_IMG));
  });
});
