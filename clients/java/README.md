# Test.ai Classifier - Java Client

The code in this directory defines a client library for use with the gRPC-based Test.ai classifier server located in the main directory of this repo.

## Installation & Setup

At this point, the library is not available on Maven Central for easy download. Instead, check the [Releases](https://github.com/testdotai/appium-classifier-plugin/releases) page to download pre-built Jarfiles you can import into your projects.

## Usage

This client exposes two classes:

```
ai.test.classifier_client.ClassifierClient;
ai.test.classifier_client.Classification;
```

The important class is `ClassifierClient`, whose constructor takes host and port parameters, so that the client can speak to the correct classifier server. The class has two important methods:

```java
Map<String, Classification> classifyElements(String label, Map<String, byte[]> elementImages,
        double confidenceThreshold, boolean allowWeakerMatches)

List<WebElement> findElementsMatchingLabel (RemoteWebDriver driver, String label,
        double confidenceThreshold, boolean allowWeakerMatches)
```

1. `classifyElements` takes a label (see `lib/labels.js` in this repo), a map of Strings (ids) to byte arrays (representing PNG image data), a confidence threshold (1.0 = perfect confidence required for a match, 0.0 = no confidence required), and a boolean flag which tells the server whether or not to return potential matches even if the potential match had a *different* label as its highest-confidence classification. The return value is a map of Strings (the same ids you passed in) to `Classification` objects (described below).
2. `findElementsMatchingLabel` is a helper function for use with Selenium tests (for Appium use the Appium plugin as described in the main README for this repo). It takes a driver object and the same final parameters as `classifyElements`. The plugin will use the driver object to take screenshots of relevant images and pass them to the classifier. The return value is a list of any `WebElement`s which match the label provided.

The `Classification` object is simply a container for the label, confidence, and confidence for the label which was originally provided.

For a concrete example, check out the `ClientSeleniumTest.java` file in this repo.
