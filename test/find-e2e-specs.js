import wd from 'wd';
import path from 'path';
import chai from 'chai';
import should from 'should';

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

describe('Finding - Android', function () {
  let driver;

  before(async function () {
    this.timeout(120000);
    driver = wd.promiseChainRemote(APPIUM);
    await driver.init(WALMART);
    await driver.setImplicitWaitTimeout(20000);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should find an element by its label', async function () {
    this.timeout(90000);
    await driver.elementByAccessibilityId('Open navigation drawer');
    await driver.elementByCustom('ai:cart').click();
    await driver.elementByAccessibilityId('Estimated Tax');
  });
});

describe('Finding - iOS', function () {
  let driver;

  before(async function () {
    this.timeout(120000);
    driver = wd.promiseChainRemote(APPIUM);
    await driver.init(PHOTOS);
    await driver.setImplicitWaitTimeout(20000);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  // this test assumes you've launched the app and hit 'continue' to the
  // 'what's new in photos' interstitial
  it('should find an element by its label', async function () {
    this.timeout(90000);
    await driver.elementByCustom('ai:search').click();
    await driver.elementByAccessibilityId('Cancel');
  });
});
