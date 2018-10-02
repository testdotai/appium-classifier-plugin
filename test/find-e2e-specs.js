import wd from 'wd';
import chai from 'chai';
import should from 'should';
import B from 'bluebird';

chai.use(should);


describe('Finding', function () {
  let driver;

  before(async function () {
    this.timeout(120000);
    // appium server should be running on below host/port, with this
    // test-ai-classifier package `npm link`ed into it
    driver = wd.promiseChainRemote('http://localhost:4723/wd/hub');
    await driver.init({
      platformName: 'Android',
      deviceName: 'Android Emulator',
      appPackage: 'com.walmart.android',
      appActivity: '.app.main.MainActivity',
      appWaitActivity: '.app.main.HomeActivity',
      automationName: 'UiAutomator2',
      semanticLabelModule: 'test-ai-classifier',
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
    await driver.elementBySemanticLabel('cart').click();
    await B.delay(2000);
    await driver.elementByXPath('//*[@text="SIGN IN TO SEE"]');
  });
});
