import wd from 'wd';
import path from 'path';
import chai from 'chai';
import should from 'should';
import B from 'bluebird';

chai.use(should);

const APPIUM = "http://localhost:4723/wd/hub";

// since when running tests we want to use the currently transpiled version of
// the module with Appium, and not a version which is installed or linked into
// the Appium tree, make sure we pass an absolute path as the module name so
// Appium is always picking up the latest from this project.
const MODULE_PATH = path.resolve(__dirname, '..');

const GENERAL = {
  customFindModules: {ai: MODULE_PATH},
  shouldUseCompactResponses: false,
  testaiAllowWeakerMatches: true,
  noReset: true,
};

const ANDROID = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  automationName: 'UiAutomator2',
  ...GENERAL,
};

const WALMART = {
  app: path.resolve(__dirname, '..', '..', 'test', 'fixtures', 'apps', 'walmart.apk'),
  appWaitActivity: '.app.main.HomeActivity',
  testaiConfidenceThreshold: 0.04,
  ...ANDROID,
};


const IOS = {
  platformName: 'iOS',
  deviceName: 'iPhone 6',
  platformVersion: '11.4',
  ...GENERAL,
};

const PHOTOS = {
  bundleId: 'com.apple.mobileslideshow',
  ...IOS,
};

function setup (caps, testTimeout = 180000, implicitWaitTimeout = 40000) {
  let test = {};

  before(async function () {
    this.timeout(testTimeout);
    test.driver = wd.promiseChainRemote(APPIUM);
    await test.driver.init(caps);
    await test.driver.setImplicitWaitTimeout(implicitWaitTimeout);
  });

  after(async function () {
    if (test.driver) {
      await test.driver.quit();
    }
  });

  return test;
}

describe('Finding by element - Android', function () {
  const t = setup(WALMART);

  it('should find an element by its label', async function () {
    this.timeout(90000);
    await t.driver.elementByAccessibilityId('Open navigation drawer');
    await t.driver.elementByCustom('ai:menu').click();
    await t.driver.elementByXPath('//android.widget.CheckedTextView[@text="Shop by Department"]');
  });

});

describe('Finding by object detection - Android', function () {
  const t = setup({testaiFindMode: 'object_detection', ...WALMART}, 180000, 180000);

  it('should find an element using the object detection strategy', async function () {
    this.timeout(180000);
    await t.driver.elementByAccessibilityId('Open navigation drawer');
    await t.driver.elementByCustom('ai:menu').click();
    await t.driver.elementByXPath('//android.widget.CheckedTextView[@text="Shop by Department"]');
  });
});

describe('Finding by element - iOS', function () {
  const t = setup(PHOTOS, 120000, 20000);

  // this test assumes you've launched the app and hit 'continue' to the
  // 'what's new in photos' interstitial
  it('should find an element by its label', async function () {
    this.timeout(90000);
    await t.driver.elementByCustom('ai:search').click();
    await t.driver.elementByAccessibilityId('Cancel');
  });
});

describe('Finding by object detection - iOS', function () {
  const t = setup({
    testaiFindMode: 'object_detection',
    testaiObjDetectionThreshold: 0.9,
    ...PHOTOS
  }, 120000, 20000);

  // this test assumes you've launched the app and hit 'continue' to the
  // 'what's new in photos' interstitial
  it('should find an element by its label', async function () {
    this.timeout(90000);
    await t.driver.elementByCustom('ai:cloud').click();
    await B.delay(5000);
    console.log(await t.driver.source());
    await t.driver.elementByAccessibilityId('Start Sharing');
  });
});
