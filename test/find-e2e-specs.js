import wd from 'wd';
import chai from 'chai';
import should from 'should';

chai.use(should);


describe('Finding', function () {
  let driver;

  before(async function () {
    // appium server should be running on below host/port, with this
    // test-ai-classifier package `npm link`ed into it
    driver = wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init({
      platformName: 'Android',
      deviceName: 'Android Emulator',
      appPackage: 'com.walmart.android',
      appActivity: '.app.main.MainActivity',
      automationName: 'UiAutomator2',
      semanticLabelModule: 'test-ai-classifier',
    });
  });

  after(async function () {
    if (driver) {
      await driver.quit();
    }
  });

  it('should find an element by its label', async function () {
    await driver.elementBySemanticLabel('cart').click();
    await driver.elementByXPath('//*[@text="SIGN IN TO SEE"]');
  });
});
