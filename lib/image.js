import { createCanvas, loadImage } from 'canvas';

async function canvasFromImage (imgData) {
  let img = await loadImage(imgData);
  let cvs = createCanvas(img.width, img.height);
  let ctx = cvs.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return cvs;
}

async function imageFromScreenshot (screenshot, size, logger) {
  let img = await loadImage(Buffer.from(screenshot, 'base64')); //`data:image/png;base64,${screenshot}`;
  if (img.width === size.width) {
    return img;
  }

  let canvas = createCanvas(size.width, size.height);
  let ctx = canvas.getContext('2d');

  logger.info(`Screenshot and screen size did not match. Screen size is ` +
              `${size.width}x${size.height} but screenshot size is ` +
              `${img.width}x${img.height}. Scaling screenshot to match screen size`);
  ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, size.width, size.height);

  const newScreenshot = canvas.toBuffer('image/png');
  img = await loadImage(newScreenshot);
  return img;
}

async function elementImageFromScreenshot (el, screenshotImg) {
  if (!el.rect) {
    throw new Error(`Unable to retrieve rect of element. Ensure that your ` +
                    `Appium session has set the shouldUseCompactResponses ` +
                    `capability to false`);
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
         getCanvasByRect };
