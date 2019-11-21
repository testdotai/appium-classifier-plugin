package ai.test.classifier_client;

import ai.test.classifier_client.ClassifierGrpc.ClassifierBlockingStub;
import ai.test.classifier_client.ClassifierOuterClass.ElementClassificationRequest;
import ai.test.classifier_client.ClassifierOuterClass.ElementClassificationResult;
import com.google.protobuf.ByteString;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import org.openqa.selenium.By;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.remote.RemoteWebElement;

public class ClassifierClient {

    public static final double DEFAULT_THRESHOLD = 0.2;

    private final ManagedChannel channel;
    private final ClassifierBlockingStub blockingStub;

    public ClassifierClient(String host, int port) {
        this(ManagedChannelBuilder.forAddress(host, port).usePlaintext());
    }

    public ClassifierClient(ManagedChannelBuilder<?> channelBuilder) {
        channel = channelBuilder.build();
        blockingStub = ClassifierGrpc.newBlockingStub(channel);
    }

    public void shutdown() throws InterruptedException {
        channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
    }

    public Map<String, Classification> classifyElements(String label, Map<String, byte[]> elementImages,
        double confidenceThreshold, boolean allowWeakerMatches) {

        Map<String, ByteString> _elementImages = new HashMap<>();
        elementImages.forEach((id, image) -> {
            _elementImages.put(id, ByteString.copyFrom(image));
        });
        ElementClassificationRequest req = ElementClassificationRequest.newBuilder()
            .setLabelHint(label)
            .setAllowWeakerMatches(allowWeakerMatches)
            .setConfidenceThreshold(confidenceThreshold)
            .putAllElementImages(_elementImages)
            .build();

        Map<String, ElementClassificationResult> res = blockingStub.classifyElements(req).getClassificationsMap();
        Map<String, Classification> classifications = new HashMap<>();
        res.forEach((id, elClassRes) -> {
            Classification c = new Classification(elClassRes.getLabel(), elClassRes.getConfidence(),
                elClassRes.getConfidenceForHint());
            classifications.put(id, c);
        });
        return classifications;
    }

    public Map<String, Classification> classifyElements(String label, Map<String, byte[]> elementImages) {
        return classifyElements(label, elementImages, DEFAULT_THRESHOLD, false);
    }


    public List<WebElement> findElementsMatchingLabel (RemoteWebDriver driver, String label,
        double confidenceThreshold, boolean allowWeakerMatches) throws Exception {

        List<WebElement> els = driver.findElements(By.xpath("//body//*[not(self::script) and not(self::style) and not(child::*)]"));
        Map<String, byte[]> elementImages = new HashMap<>();
        Map<String, WebElement> elements = new HashMap<>();
        for (WebElement el : els) {
            String elId = ((RemoteWebElement)el).getId();
            elements.put(elId, el);
            try {
                elementImages.put(elId, el.getScreenshotAs(OutputType.BYTES));
            } catch (Exception ign) {}
        }
        if (elementImages.size() < 1) {
            throw new Exception("Didn't find any leaf node elements with valid screenshots");
        }
        Map<String, Classification> classifications = classifyElements(label, elementImages,
            confidenceThreshold, allowWeakerMatches);
        List<WebElement> matchedEls = new ArrayList<>();
        classifications.forEach((id, clsf) -> {
            matchedEls.add(elements.get(id));
        });
        return matchedEls;
    }

    public List<WebElement> findElementsMatchingLabel (RemoteWebDriver driver, String label) throws Exception {
        return findElementsMatchingLabel(driver, label, DEFAULT_THRESHOLD, false);
    }
}