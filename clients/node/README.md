# Test.ai Classifier - Node.js + WebdriverIO Client

The code in this directory defines a client library for use with the gRPC-based Test.ai classifier server located in the main directory of this repo.

This client exposes as the default export a `ClassifierClient` class, which can be instantiated as follows:

```js
const client = new ClassifierClient({host, port})
```

(Where `host` and `port` refer to the address and port the server is running on).

The client exposes two instance methods:

1. `classifyElements` takes an object parameter with 4 keys:
    1. `labelHint`: the label you wish to find matching elements with (see `lib/labels.js` in this repo).
    2. `elementImages`: an object whose keys are ids, and whose values are `Buffer` objects containing raw binary data of PNG images.
    3. `confidenceThreshold`: (optional) the confidence below which not to return matches (0.0 - 1.0)
    4. `allowWeakerMatches`: (optional) whether or not to return a match for elements that *did* match the label, but for whom *another* label had a higher confidence.
    The return value of this method is an object whose keys are the same ids you sent in, and whose values are classification objects with the following keys:
    1. `label`: the matching label
    2. `confidence`: the confidence for the matched label
    3. `confidenceForLabel`: the confidence for the label given in `labelHint`
2. `findElementsMatchingLabel` is a helper function for use with Selenium tests (for Appium use the Appium plugin as described in the main README for this repo). It takes an object parameter with 4 keys: all of the same keys as in `classifyElements` except for `elementImages` which is replaced by:
    1. `driver`: the WebdriverIO driver object
    The return value of this method is an array of WebdriverIO element objects that match.

For a concrete example, see `test/rpc-e2e-specs.js`
