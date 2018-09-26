import path from 'path';
import chai from 'chai';
import should from 'should';
import { getModel, tensorFromImage, predictionFromImage } from '../lib/classifier';

chai.use(should);

const TEST_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "image.png");

describe('Model', function () {
  it('should load the model', async function () {
    await getModel();
  });

  it('should make predictions based on model', async function () {
    const pred = await predictionFromImage(TEST_IMG);
    pred.should.eql("cart");
  });
});

describe('Image Tensor', function () {
  it('should get a tensor for an image', async function () {
    await tensorFromImage(TEST_IMG);
  });
});
