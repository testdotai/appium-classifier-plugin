import path from 'path';
import Canvas, { Image } from 'canvas';
import { asyncmap } from 'asyncbox';
import labels from './labels';
import * as tf from '@tensorflow/tfjs';

import '@tensorflow/tfjs-node';

const TF_MODEL = path.resolve(__dirname, "..", "..", "model", "model.pb");
const TF_WEIGHTS = path.resolve(__dirname, "..", "..", "model", "weights.json");

const IMG_CHANNELS = 3;

let _cached_model = null;

export async function getModel () {
  if (!_cached_model) {
    _cached_model = await tf.loadFrozenModel(`file://${TF_MODEL}`, `file://${TF_WEIGHTS}`);
  }
  return _cached_model;
}

async function canvasFromImage (imgData) {
  let img = new Image();
  img.src = imgData;
  let cvs = new Canvas(img.width, img.height);
  let ctx = cvs.getContext('2d', {pixelFormat: 'A8'}); // grayscale, I hope
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return cvs;
}

export async function tensorFromImage (imgData, height=299, width=299, mean=0,
    std=255) {
  const canvas = await canvasFromImage(imgData);
  let t = await tf.fromPixels(canvas, IMG_CHANNELS);
  t = tf.cast(t, 'float32');
  t = t.expandDims(0);
  t = tf.image.resizeBilinear(t, [height, width]);
  t = tf.div(tf.sub(t, [mean]), [std]);
  return t;
}

export async function predictionFromImage (imgData) {
  const model = await getModel();
  const t = await tensorFromImage(imgData);
  let pred = model.predict(t);
  pred = pred.squeeze();
  let confMap = getConfidenceMap(await pred.data());
  confMap.sort((a, b) => b[1] - a[1]);
  return confMap[0][0];
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

async function elementImageFromScreenshot (el, screenshot) {
  console.log('rect', el.rect);
  const {x, y, width, height} = el.rect;
  let img = new Image();
  img.src = `data:image/png;base64,${screenshot}`;
  let cvs = new Canvas(width, height);
  let ctx = cvs.getContext('2d', {pixelFormat: 'A8'});
  ctx.drawImage(img, x, y, img.width, img.height);
  return cvs;
}

export default async function find (driver, logger, label, /* multiple */) {
  // first make sure that we can get the 'rect' setting with the element
  // response, so we don't have to make additional queries to appium for that
  // information
  const curSetting = await driver.getSettings().elementResponseAttributes;
  const needToChangeSetting = !curSetting || curSetting.indexOf("rect") === -1;
  if (needToChangeSetting) {
    await driver.setSettings({elementResponseAttributes: "rect"});
  }
  try {
    logger.info("Getting screenshot to use for classifier");
    const screenshot = await driver.getScreenshot();

    // just find all elements
    // TODO find a more performant way to do this (potentially requiring
    // platform-specific calls)
    logger.info("Retrieving data for all elements on screen");
    const els = await driver.findElements("xpath", "//*");

    // match up each element with its slice of the screenshot
    logger.info("Getting screenshot slices for each element");
    const elsAndImages = asyncmap(els, async (e) => {
      return [e, await elementImageFromScreenshot(e, screenshot)];
    });

    // turn each screenshot slice into a label prediction, still linked up with
    // the appium element
    logger.info("Making label predictions based on element images");
    const elsAndPreds = asyncmap(elsAndImages, async (ei) => {
      return [ei[0], await predictionFromImage(ei[1])];
    });

    // get rid of any elements whose label prediction doesn't match what the
    // user has requested
    const matchingEls = elsAndPreds.filter(ep => ep[1] === label);
    logger.info(`Found ${matchingEls.length} matching elements`);

    // return matching elements (letting appium decide whether to return one
    // or more to the user
    return matchingEls.map(ep => ep[0]);
  } finally {
    // always clean up setting after the find
    if (needToChangeSetting) {
      await driver.setSettings({elementResponseAttributes: curSetting});
    }
  }
}
