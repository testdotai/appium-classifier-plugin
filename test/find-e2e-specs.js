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

const FILES = {
  appPackage: 'com.android.documentsui',
  appActivity: '.files.FilesActivity',
  ...ANDROID,
};

const IOS = {
  automationName: 'XCUITest',
  platformName: 'iOS',
  deviceName: 'iPhone 8',
  platformVersion: '11.4',
  ...GENERAL,
};

const PHOTOS = {
  bundleId: 'com.apple.mobileslideshow',
  ...IOS,
};

const FILES_IOS = {
  bundleId: 'com.apple.DocumentsApp',
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
  const t = setup(FILES);

  it('should find an element by its label', async function () {
    this.timeout(90000);
    await t.driver.elementByAccessibilityId('More options');
    await t.driver.elementByCustom('ai:menu').click();
    await t.driver.elementByXPath('//android.widget.TextView[@text="SDCARD"]');
  });

});

describe('Finding by object detection - Android', function () {
  const t = setup({
    testaiFindMode: 'object_detection',
    testaiObjDetectionDebug: true,
    ...FILES
  }, 180000, 180000);

  it('should find an element using the object detection strategy', async function () {
    this.timeout(180000);
    await t.driver.updateSettings({checkForImageElementStaleness: false});
    await t.driver.elementByAccessibilityId('More options');
    await t.driver.elementByCustom('ai:menu').click();
    await t.driver.elementByXPath('//android.widget.TextView[@text="SDCARD"]');
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
    testaiObjDetectionDebug: true,
    testaiObjDetectionThreshold: 0.9,
    ...PHOTOS
  }, 120000, 20000);

  // this test assumes you've launched the app and hit 'continue' to the
  // 'what's new in photos' interstitial
  it('should find an element by its label', async function () {
    await t.driver.updateSettings({checkForImageElementStaleness: false});
    this.timeout(90000);
    await t.driver.elementByCustom('ai:search').click();
    await B.delay(5000);
    await t.driver.elementByAccessibilityId('October 2009');
  });
});

describe('Finding grouped icon - iOS', function () {
  const t = setup({
    testaiFindMode: 'object_detection',
    testaiObjDetectionDebug: true,
    testaiObjDetectionThreshold: 0.9,
    ...FILES_IOS
  }, 120000, 20000);

  it('should find an element by its label', async function () {
    this.timeout(90000);
    await t.driver.updateSettings({checkForImageElementStaleness: false});
    await t.driver.elementByAccessibilityId('Browse').click();
    await t.driver.elementByCustom('ai:clock').click();
    await t.driver.elementByAccessibilityId('No Recents');
  });
});
