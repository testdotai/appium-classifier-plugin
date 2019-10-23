const wd = require('wd');

const APPIUM = "http://localhost:4723/wd/hub";

const ANDROID_CAPS = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  automationName: 'UiAutomator2',
  noReset: true,
  appPackage: 'com.android.documentsui',
  appActivity: '.files.FilesActivity',
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
    // ensure we loaded the app
    await driver.elementByAccessibilityId('More options');

    // click on the menu button using the ai finder
    await driver.elementByCustom('ai:menu').click();

    // prove the menu opened by finding a menu item
    await driver.elementByXPath('//android.widget.TextView[@text="SDCARD"]');
  });
});
