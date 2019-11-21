import ai.test.classifier_client.Classification;
import ai.test.classifier_client.ClassifierClient;
import com.google.common.collect.ImmutableMap;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import org.hamcrest.Matchers;
import org.junit.AfterClass;
import org.junit.Assert;
import org.junit.BeforeClass;
import org.junit.Test;

public class ClientTest {

    private static ClassifierClient client;

    private static final Path CART = Paths.get("src/test/resources/cart.png");
    private static final Path MENU = Paths.get("src/test/resources/menu.png");

    @BeforeClass
    public static void setUp() {
        client = new ClassifierClient("127.0.0.1", 50051);
    }

    @AfterClass
    public static void tearDown() throws InterruptedException {
        client.shutdown();
    }

    @Test
    public void testClassification() throws IOException {
        byte[] cartBytes = Files.readAllBytes(CART);
        byte[] menuBytes = Files.readAllBytes(MENU);
        Map<String, byte[]> elementImages = ImmutableMap.of("cart", cartBytes, "menu", menuBytes);

        Map<String, Classification> classifications = client.classifyElements("cart", elementImages);
        Classification cartCls = classifications.get("cart");
        Assert.assertEquals(cartCls.getLabel(), "cart");
        Assert.assertThat(classifications, Matchers.not(Matchers.hasKey("menu")));

        classifications = client.classifyElements("cart", elementImages, 0.0, true);
        cartCls = classifications.get("cart");
        Classification menuCls = classifications.get("menu");
        Assert.assertEquals(cartCls.getLabel(), "cart");
        Assert.assertEquals(menuCls.getLabel(), "menu");
        Assert.assertThat(cartCls.getConfidenceForLabel(), Matchers.greaterThan(menuCls.getConfidenceForLabel()));
    }
}
