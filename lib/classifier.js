import path from 'path';
import { imageFromScreenshot, getCanvasByRect, elementImageFromScreenshot } from './image';
import { asyncmap, retry } from 'asyncbox';
import labels from './labels';
import * as tf from '@tensorflow/tfjs';

import '@tensorflow/tfjs-node';

const TF_MODEL = path.resolve(__dirname, "..", "..", "model", "model.pb");
const TF_WEIGHTS = path.resolve(__dirname, "..", "..", "model", "weights.json");

const IMG_CHANNELS = 3;

let _cached_model = null;

async function getModel () {
  if (!_cached_model) {
    _cached_model = await tf.loadFrozenModel(`file://${TF_MODEL}`, `file://${TF_WEIGHTS}`);
  }
  return _cached_model;
}

async function tensorFromImage (canvas, height=299, width=299, mean=0,
    std=255) {
  let t = await tf.fromPixels(canvas, IMG_CHANNELS);
  t = tf.cast(t, 'float32');
  // TODO make the image tensor grayscale
  t = t.expandDims(0);
  t = tf.image.resizeBilinear(t, [height, width]);
  t = tf.div(tf.sub(t, [mean]), [std]);
  return t;
}

async function predictionFromImage (imgData) {
  const model = await getModel();
  const t = await tensorFromImage(imgData);
  let pred = model.predict(t);
  pred = pred.squeeze();
  let confMap = getConfidenceMap(await pred.data());
  confMap.sort((a, b) => b[1] - a[1]);
  const label = confMap[0][0];
  return label;
}

function getConfidenceMap (predArr) {
  if (predArr.length !== labels.length) {
    throw new Error(`Prediction result array had ${predArr.length} elements ` +
                    `but labels list had ${labels.length} elements. They ` +
                    `need to match.`);
  }
  let map = [];
  for (let i = 0; i < labels.length; i++) {
    map.push([labels[i], predArr[i]]);
  }
  return map;
}

async function getAllElements (driver, logger) {
  // TODO find a more performant way to do this (potentially requiring
  // platform-specific calls)
  logger.info("Retrieving data for all leaf-node elements on screen");

  // retry since we can often get a staleelementexception when trying to find
  // all elements
  const els = await retry(5, driver.findElements.bind(driver), "xpath", "//*[not(child::*)]");

  return els;
}

async function getScreenshot (driver, logger) {
  logger.info("Getting window size in case we need to scale screenshot");
  const size = await driver.getWindowSize();

  logger.info("Getting screenshot to use for classifier");
  const screenshot = await driver.getScreenshot();

  logger.info("Turning screenshot into HTML image for use with canvas");
  return await imageFromScreenshot(screenshot, size, logger);
}

async function getElementImages (els, screenshotImg, logger) {
  // keep a cache of images based on the rect that defines them, so we don't
  // make image slices we've already made before if elements have the same
  // rect
  let elImgCache = [];

  // match up each element with its slice of the screenshot
  logger.info("Getting screenshot slices for each element");
  return await asyncmap(els, async (e) => {
    // if we've already got the image slice in the cache, return it
    const existingCanvas = getCanvasByRect(elImgCache, e.rect);
    if (existingCanvas) {
      return [e, existingCanvas];
    }

    // otherwise actually do the slicing, get the image, and add it to the
    // cache before returning it
    const res = await elementImageFromScreenshot(e, screenshotImg);
    elImgCache.push(res);
    return [e, res.canvas];
  });
}

async function getMatchingElements (elsAndImages, label, logger) {
  // turn each screenshot slice into a label prediction, still linked up with
  // the appium element
  logger.info("Making label predictions based on element images");
  const elsAndPreds = await asyncmap(elsAndImages, async (ei) => {
    return [ei[0], await predictionFromImage(ei[1])];
  });

  // get rid of any elements whose label prediction doesn't match what the
  // user has requested
  const matchingEls = elsAndPreds.filter(ep => ep[1] === label);
  logger.info(`Found ${matchingEls.length} matching elements`);

  // return matching elements (letting appium decide whether to return one
  // or more to the user
  return matchingEls.map(ep => ep[0]);
}

async function find (driver, logger, label, /* multiple */) {
  // first make sure that we can get the 'rect' setting with the element
  // response, so we don't have to make additional queries to appium for that
  // information
  const curSetting = await driver.getSettings().elementResponseAttributes;
  const needToChangeSetting = !curSetting || curSetting.indexOf("rect") === -1;
  if (needToChangeSetting) {
    await driver.updateSettings({elementResponseAttributes: "rect"});
  }
  try {
    const els = await getAllElements(driver, logger);
    const screenshotImg = await getScreenshot(driver, logger);
    const elsAndImages = await getElementImages(els, screenshotImg, logger);
    return await getMatchingElements(elsAndImages, label, logger);
  } finally {
    // always clean up setting after the find
    if (needToChangeSetting) {
      await driver.updateSettings({elementResponseAttributes: curSetting});
    }
  }
}

export { getModel, tensorFromImage, predictionFromImage };
export default find;
