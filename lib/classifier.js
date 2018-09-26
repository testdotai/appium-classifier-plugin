import path from 'path';
import Canvas, { Image } from 'canvas';
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

export default async function find (driver, label, multiple) {
  const model = await getModel();
}
