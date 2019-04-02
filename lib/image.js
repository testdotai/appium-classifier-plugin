import { createCanvas, createImageData, loadImage } from 'canvas';

async function canvasFromImage (imgData) {
  let img = await loadImage(imgData);
  let cvs = createCanvas(img.width, img.height);
  let ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return cvs;
}

function canvasFromImageData (imgData, width, height) {
  const cvs = createCanvas(width, height);
  const data = createImageData(imgData, width, height);
  const ctx = cvs.getContext('2d');
  ctx.putImageData(data, 0, 0);
  return cvs;
}

async function imageFromScreenshot (screenshot, size, logger) {
  let image = await loadImage(Buffer.from(screenshot, 'base64'));
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, size.width, size.height);

  const imageData = canvas.toBuffer('image/png');

  if (image.width !== size.width) {
    logger.info(`Screenshot and screen size did not match. Screen size is ` +
                `${size.width}x${size.height} but screenshot size is ` +
                `${image.width}x${image.height}. Scaled screenshot to match screen size`);
    image = await loadImage(imageData);
  }
  return {canvas, image, imageData};
}

async function elementImageFromScreenshot (el, screenshotImg) {
  if (!el.rect) {
    throw new Error(`Unable to retrieve rect of element. Ensure that your ` +
                    `Appium session has set the shouldUseCompactResponses ` +
                    `capability to false`);
  }

  if (el.rect.width === 0 || el.rect.height === 0) {
    throw new Error("Element had a width or height of zero; cannot slice " +
                    "such an image");
  }

  const {x, y, width, height} = el.rect;
  let canvas = createCanvas(width, height);
  let ctx = canvas.getContext('2d');
  ctx.drawImage(screenshotImg, x, y, width, height, 0, 0, width, height);
  return {canvas, x, y, width, height};
}

function getCanvasByRect (cache, rect) {
  const {x, y, width, height} = rect;
  const existingCanvas = cache.filter((ei) => {
    return ei.x === x && ei.y === y &&
           ei.width === width && ei.height === height;
  })[0];

  if (existingCanvas) {
    return existingCanvas.canvas;
  }
}

export { canvasFromImage, imageFromScreenshot, elementImageFromScreenshot,
  canvasFromImageData, getCanvasByRect };
