import ai.test.classifier_client.ClassifierClient;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;
import org.hamcrest.collection.IsCollectionWithSize;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

public class ClientSeleniumTest {

    private RemoteWebDriver driver;
    private ClassifierClient classifier;

    @Before
    public void setUp() throws MalformedURLException {
        DesiredCapabilities caps = DesiredCapabilities.chrome();
        driver = new RemoteWebDriver(new URL("http://localhost:4444/wd/hub"), caps);
        classifier = new ClassifierClient("127.0.0.1", 50051);
    }

    @After
    public void tearDown() throws InterruptedException {
        if (driver != null) {
            driver.quit();
        }
        classifier.shutdown();
    }


    @Test
    public void testClassifierClient() throws Exception {
        driver.get("https://test.ai");
        List<WebElement> els = classifier.findElementsMatchingLabel(driver, "twitter");
        Assert.assertThat(els, IsCollectionWithSize.hasSize(1));
        els.get(0).click();
        Assert.assertEquals(driver.getCurrentUrl(), "https://twitter.com/testdotai");
    }


}