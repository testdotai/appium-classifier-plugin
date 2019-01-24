import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import { imageFromScreenshot, getCanvasByRect, canvasFromImageData,
  elementImageFromScreenshot } from './image';
import { asyncmap, retry } from 'asyncbox';
import B from 'bluebird';
import labels from './labels';
import * as tf from '@tensorflow/tfjs';

import '@tensorflow/tfjs-node';

const DEBUG_IMAGES = process.env.DEBUG_IMAGES || false; // truthy to write out images
const DEBUG_IMAGE_DIR = process.env.DEBUG_IMAGE_DIR || `${process.env.HOME}/elements`;

const DEFAULT_CONFIDENCE_THRESHOLD = 0.2;

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

async function tensorFromImage (canvas, height=224, width=224, mean=0,
  std=255) {
  let t = await tf.fromPixels(canvas, IMG_CHANNELS);

  // convert to grayscale
  t = t.mean(2); // average down the r/g/b values
  t = tf.stack([t, t, t], 2); // then repeat each monochrome value 3 times to turn it back to rgb

  // change type to floats because we eventually want to normalize values in
  // the 0-1 range
  t = tf.cast(t, 'float32');

  // now actually do the normalize
  t = tf.div(tf.sub(t, [mean]), [std]);

  // resize the image to the specified height and width
  t = tf.image.resizeBilinear(t, [height, width]);

  return t;
}

async function tensorFromImages (canvases, height=224, width=224, mean=0, std=255) {
  const tensors = await asyncmap(canvases, async (canvas) => {
    return tensorFromImage(canvas, height, width, mean, std);
  });
  return tf.stack(tensors);
}

async function saveImageFromTensor (tensor, imgFile) {
  if (tensor.shape.length === 4) {
    // if we have the tensor we get in tensorFromImage, it has an extra dim, so
    // squeeze it out
    tensor = tensor.squeeze();
  }
  const [w, h] = tensor.shape;
  const pxArray = await tf.toPixels(tensor);
  const cvs = canvasFromImageData(pxArray, w, h);
  fs.writeFileSync(imgFile, cvs.toBuffer('image/png'));
}

async function predictionFromImage (imgData, confidence, labelHint, imgExt = ".png") {
  const model = await getModel();
  let t = await tensorFromImage(imgData);
  // if we're just finding a prediction for a single image, we need to add
  // a dimension on the front end because the model is looking for an array of
  // images
  t = t.expandDims(0);

  if (DEBUG_IMAGES) {
    await saveImageFromTensor(t, path.resolve(DEBUG_IMAGE_DIR, `tensor-for-${labelHint}.${imgExt}`));
  }
  let pred = model.predict(t);
  pred = pred.squeeze();
  const confMap = getConfidenceMap(await pred.data());
  return predictionFromConfMap(confMap, confidence, labelHint);
}

async function predictionsFromImages (imgDatas, confidence, labelHint, imgExt = ".png") {
  const model = await getModel();
  const tensors = await tensorFromImages(imgDatas);
  if (DEBUG_IMAGES) {
    await B.all(tensors, async (t, i) => {
      await saveImageFromTensor(t, path.resolve(DEBUG_IMAGE_DIR, `tensor-for-${labelHint}-${i}.${imgExt}`));
    });
  }
  const predTensors = model.predict(tensors);
  let preds = [];
  for (let i = 0; i < imgDatas.length; i++) {
    const confMapTensor = tf.slice(predTensors, [i, 0], 1).squeeze();
    const confMap = getConfidenceMap(await confMapTensor.data());
    preds.push(predictionFromConfMap(confMap, confidence, labelHint));
  }
  return preds;
}

function predictionFromConfMap (confMap, confidence, desiredLabel) {
  // keep track of the confidence for the label the user is looking for so we
  // can provide that feedback, if an element is not ultimately found
  let confForDesiredLabel = 0;
  let onlyDesiredLabel = confMap.filter(i => i[0] === desiredLabel);
  if (onlyDesiredLabel.length > 0) {
    confForDesiredLabel = onlyDesiredLabel[0][1];
  }
  confMap.sort((a, b) => b[1] - a[1]);

  // if the most likely classified label is below our confidence threshold,
  // say it's unclassified
  let foundLabel;
  if (confMap[0][1] < confidence) {
    foundLabel = "unclassified";
  } else {
    foundLabel = confMap[0][0];
  }
  return [foundLabel, confForDesiredLabel];
}

function getConfidenceMap (predArr) {
  if (predArr.length !== labels.length) {
    throw new Error(`Prediction result array had ${predArr.length} elements ` +
                    `but labels list had ${labels.length} elements. They ` +
                    `need to match.`);
  }
  let map = [];
  for (let i = 0; i < labels.length; i++) {
    if (labels[i].trim() !== "unclassified") {
      map.push([labels[i], predArr[i]]);
    }
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
  const elsAndImages = await asyncmap(els, async (e) => {
    // if we've already got the image slice in the cache, return it
    const existingCanvas = getCanvasByRect(elImgCache, e.rect);
    if (existingCanvas) {
      return [e, existingCanvas];
    }

    // otherwise actually do the slicing, get the image, and add it to the
    // cache before returning it
    let res;
    try {
      res = await elementImageFromScreenshot(e, screenshotImg);
      if (DEBUG_IMAGES) {
        const imgFile = `${DEBUG_IMAGE_DIR}/element-(${e.rect.x}, ${e.rect.y}) ` +
                        `[${e.rect.width} x ${e.rect.height}].png`;
        fs.writeFileSync(imgFile, res.canvas.toBuffer('image/png'));
      }
    } catch (err) {
      logger.warn(`Could not get element image from screenshot; its rect was ` +
                  `${JSON.stringify(e.rect)}. Original err: ${err}`);
      return false;
    }

    elImgCache.push(res);
    return [e, res.canvas];
  });

  // filter out any elements for whom we could not extract images
  return elsAndImages.filter(Boolean);
}

async function getMatchingElements (elsAndImages, label, confidence, logger) {
  // turn each screenshot slice into a label prediction, still linked up with
  // the appium element
  logger.info("Making label predictions based on element images");
  const start = Date.now();
  const preds = await predictionsFromImages(elsAndImages.map(ei => ei[1]), confidence, label);
  const elapsed = Date.now() - start;
  logger.info(`Predictions for ${elsAndImages.length} element(s) took ${elapsed / 1000} seconds`);
  let elsAndPreds = [];
  for (let i = 0; i < elsAndImages.length; i++) {
    elsAndPreds.push([elsAndImages[i][0], ...preds[i]]);
  }

  // get rid of any elements whose label prediction doesn't match what the
  // user has requested
  const matchingEls = elsAndPreds.filter(ep => ep[1] === label);
  logger.info(`Found ${matchingEls.length} matching elements`);

  // short-circuit if we found no matching elements
  if (matchingEls.length < 1) {
    return [];
  }

  // sort the matching elements by confidence
  matchingEls.sort((a, b) => b[2] - a[2]);

  logger.info(`Highest confidence of any element for desired label ` +
              `'${label}' was ${matchingEls[0][2]}`);

  // return matching elements (letting appium decide whether to return one
  // or more to the user)
  return matchingEls.map(ep => ep[0]);
}

function getConfidenceThreshold (driver, logger) {
  let confidence = DEFAULT_CONFIDENCE_THRESHOLD;
  const confCap = driver.opts.testaiConfidenceThreshold;
  if (confCap) {
    if (!_.isNumber(confCap) || confCap < 0 || confCap > 1) {
      throw new Error(`The 'testaiConfidenceThreshold' capability must be a ` +
                      `number between 0 and 1`);
    }
    confidence = confCap;
    logger.info(`Setting confidence threshold to overridden value of ${confCap}`);
  } else {
    logger.info(`Setting confidence threshold to default value of ${DEFAULT_CONFIDENCE_THRESHOLD}`);
  }
  return confidence;
}

async function find (driver, logger, label, /* multiple */) {
  // first make sure that we can get the 'rect' setting with the element
  // response, so we don't have to make additional queries to appium for that
  // information
  logger.info("Retrieving current settings to check element response attributes");
  const curSetting = (await driver.getSettings()).elementResponseAttributes;
  const needToChangeSetting = !curSetting || curSetting.indexOf("rect") === -1;

  if (needToChangeSetting) {
    logger.info("We will need to update settings to include element response " +
                "attributes");
    await driver.updateSettings({elementResponseAttributes: "rect"});
  }

  const confidence = getConfidenceThreshold(driver, logger);

  try {
    const els = await getAllElements(driver, logger);
    const screenshotImg = await getScreenshot(driver, logger);
    const elsAndImages = await getElementImages(els, screenshotImg, logger);
    return await getMatchingElements(elsAndImages, label, confidence, logger);
  } finally {
    // always clean up setting after the find
    if (needToChangeSetting) {
      logger.info(`Resetting element response attribute setting to original ` +
                  `value: ${JSON.stringify(curSetting)}`);
      await driver.updateSettings({elementResponseAttributes: curSetting});
    }
  }
}

export { getModel, tensorFromImage, predictionFromImage, saveImageFromTensor,
  tensorFromImages, predictionsFromImages, DEFAULT_CONFIDENCE_THRESHOLD };
export default find;
