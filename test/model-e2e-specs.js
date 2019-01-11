import path from 'path';
import chai from 'chai';
import should from 'should';
import { getModel, tensorFromImage, saveImageFromTensor, predictionFromImage,
  DEFAULT_CONFIDENCE_THRESHOLD } from '../lib/classifier';
import { canvasFromImage } from '../lib/image';

chai.use(should);

const CART_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "cart.png");
const MIC_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "microphone.png");
const FOLDER_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "folder.png");
const MENU_IMG = path.resolve(__dirname, "..", "..", "test", "fixtures", "menu.png");

describe('Model', function () {
  it('should load the model', async function () {
    await getModel();
  });

  it.skip('should load and save a tensor', async function () {
    // use for debugging
    const t = await tensorFromImage(await canvasFromImage(MENU_IMG));
    await saveImageFromTensor(t, "debug.png");
  });

  it('should make predictions based on model - cart', async function () {
    let pred = await predictionFromImage(await canvasFromImage(CART_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "cart");
    pred[0].should.eql("cart");
  });

  it('should make predictions based on model - mic', async function () {
    let pred = await predictionFromImage(await canvasFromImage(MIC_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "microphone");
    pred[0].should.eql("microphone");
  });

  it('should make predictions based on model - menu', async function () {
    let pred = await predictionFromImage(await canvasFromImage(MENU_IMG), DEFAULT_CONFIDENCE_THRESHOLD, "menu");
    pred[0].should.eql("menu");
  });

  it('should make predictions based on model - unclassified', async function () {
    let pred = await predictionFromImage(await canvasFromImage(FOLDER_IMG), 0.8, "folder");
    pred[0].should.eql("unclassified");
  });

  it('should obey a confidence threshold', async function () {
    let pred = await predictionFromImage(await canvasFromImage(CART_IMG), 1, "cart");
    pred[0].should.eql("unclassified");

    pred = await predictionFromImage(await canvasFromImage(FOLDER_IMG), 0.01, "folder");
    pred[0].should.eql("fire");
  });
});

describe('Image Tensor', function () {
  it('should get a tensor for an image', async function () {
    await tensorFromImage(await canvasFromImage(CART_IMG));
  });
});
