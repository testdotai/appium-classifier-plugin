import wd from 'wd';
import path from 'path';
import chai from 'chai';
import should from 'should';

chai.use(should);

// since when running tests we want to use the currently transpiled version of
// the module with Appium, and not a version which is installed or linked into
// the Appium tree, make sure we pass an absolute path as the module name so
// Appium is always picking up the latest from this project.
const MODULE_PATH = path.resolve(__dirname, '..');

const WALMART = {
  app: path.resolve(__dirname, '..', '..', 'test', 'fixtures', 'apps', 'walmart.apk'),
  appWaitActivity: '.app.main.HomeActivity',
};

const ANDROID = {
  platformName: 'Android',
  deviceName: 'Android Emulator',
  automationName: 'UiAutomator2',
  customFindModules: {ai: MODULE_PATH},
  shouldUseCompactResponses: false,
};

describe('Finding', function () {
  let driver;

  before(async function () {
    this.timeout(120000);
    // appium server should be running on below host/port, with this
    // test-ai-classifier package `npm link`ed into it
    driver = wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init({...WALMART, ...ANDROID});
    await driver.setImplicitWaitTimeout(20000);
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should find an element by its label', async function () {
    this.timeout(60000);
    await driver.elementByAccessibilityId('Open navigation drawer');
    await driver.elementByCustom('ai:cart').click();
    await driver.elementByAccessibilityId('Estimated Tax');
  });
});
