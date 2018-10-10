import wd from 'wd';
import path from 'path';
import chai from 'chai';
import should from 'should';
import B from 'bluebird';

chai.use(should);

const WALMART = {
  app: path.resolve(__dirname, '..', '..', 'test', 'fixtures', 'apps', 'walmart.apk'),
  appWaitActivity: '.app.main.HomeActivity',
};

describe('Finding', function () {
  let driver;

  before(async function () {
    this.timeout(120000);
    // appium server should be running on below host/port, with this
    // test-ai-classifier package `npm link`ed into it
    driver = wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init({
      ...WALMART,
      platformName: 'Android',
      deviceName: 'Android Emulator',
      automationName: 'UiAutomator2',
      customFindModule: 'test-ai-classifier',
      shouldUseCompactResponses: false,
    });
    await B.delay(8000); // wait just a bit for things to be ready
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should find an element by its label', async function () {
    this.timeout(60000);
    await driver.elementByCustom('cart').click();
    await B.delay(2000);
    await driver.elementByXPath('//*[@text="SIGN IN TO SEE"]');
  });
});
