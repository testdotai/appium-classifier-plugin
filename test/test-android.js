const wd = require('wd');
const B = require('bluebird');

const APPIUM = "http://localhost:4723/wd/hub";

const ANDROID_CAPS = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  automationName: 'UiAutomator2',
  noReset: true,
  appPackage: 'com.walmart.android',
  appActivity: '.app.main.MainActivity',
  customFindModules: {'ai': 'test-ai-classifier'},
  shouldUseCompactResponses: false,
};

describe('Finding an Android element with machine learning magic', function () {
  let driver;

  before(async function () {
    driver = wd.promiseChainRemote(APPIUM);
    await driver.init(ANDROID_CAPS);
    await driver.setImplicitWaitTimeout(20000);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should find the cart button', async function () {
    await driver.elementByAccessibilityId('Open navigation drawer');
    await driver.elementByCustom('ai:cart').click();
    await B.delay(6000); // for effect
  });
});
