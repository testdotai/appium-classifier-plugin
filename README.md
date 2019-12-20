# Test.ai Classifier Server and Appium Plugin

This is an experimental plugin for [Appium](https://appium.io) that enables
test automation of mobile apps using [Test.ai](https://test.ai)'s
machine-learning element type classifier. It allows you to find Appium elements
using a semantic label (like "cart" or "microphone" or "arrow") instead of
having to dig through your app hierarchy. The same labels can be used to find
elements with the same general shape across different apps and different visual
designs.

In addition to being a plugin for Appium, this project also contains a small
server that can be run, bundled with clients in various programming languages
that allow the same functionality for [Selenium](https://seleniumhq.org). (See further below)

If you haven't worked with Appium element finding plugins before, you should
first check out the [Appium element finding plugins
doc](https://github.com/appium/appium/blob/52e5bf1217f08b963136254222ba2ebef428f0d1/docs/en/advanced-concepts/element-finding-plugins.md).

## System Setup

First, you'll need some system dependencies to do with image processing.

### macOS

```
brew install pkg-config cairo pango libpng jpeg giflib
```

### Linux

```
sudo apt-get install pkg-config libcairo2-dev libpango* libpng-dev libjpeg-dev giflib*
```
You may have to install each package individually if you run into issues

### Windows

TBD (not yet tested or supported)

## Appium Setup

Appium's element finding plugin feature is experimental, so you will need to be
using Appium version 1.9.2-beta.2 at a minimum. Also, be sure you either using
the XCUITest driver (for iOS) or the UiAutomator2 or Espresso drivers (for
Android). The older iOS and Android drivers do not support the required Appium
capabilities, and are deprecated in any case.

If you wish to take advantage of the object detection mode for the plugin (see
below), you'll need Appium 1.13.0 or higher.

## Classifier Setup

To make this plugin available to Appium, you have three options:

1. Simply go to the directory where Appium is installed (whether a git clone,
   or installed in the global `node_modules` directory by NPM), and run `npm
   install test-ai-classifier` to install this plugin into Appium's dependency
   tree and make it available.
2. Install it anywhere on your filesystem and use an absolute path as the
   module name (see below).
3. Install it globally (`npm install -g test-ai-classifier`) and make sure your
   `NODE_PATH` is set to the global `node_modules` dir.

## Usage

Element finding plugins are made available via a special locator strategy,
`-custom`. To tell Appium which plugin to use when this locator strategy is
requested, send in the module name and a selector shortcut as the
`customFindModules` capability. For example, to use this plugin, set the
`customFindModules` capability to something like `{"ai": "test-ai-classifier"}`
(here `ai` is the "selector shortcut" and `test-ai-classifier` is the "module
name"). This will enable access to the plugin when using selectors of the form
`ai:foo` (or simply `foo` if this is the only custom find module you are using
with Appium).

In addition to this capability, you'll need to set another Appium capability,
`shouldUseCompactResponses`, to `false`. This directs Appium to include extra
information about elements while they are being found, which dramatically
speeds up the process of getting inputs to this plugin.

In your test, you can now make new findElement calls, for example:

```js
driver.findElement('-custom', 'ai:cart');
```

The above command (which will differ for each Appium client, of course), will
use this plugin to find a shopping cart element on the screen.

How did we know we could use "cart" as a label? There is a predefined list of
available labels in `lib/labels.js`--check there to see if the elements you
want to find match any of them.

### Match Confidence

Using the `testaiConfidenceThreshold` capability, you can set a confidence
threshold below which the plugin will refuse to consider elements as matching
your label. This capability should be a number between 0 and 1, where 1 means
confidence must be perfect, and 0 means no confidence at all is required.

This is a useful capability to set after reading the Appium logs from a failed
element find; this plugin will tell you what the highest confidence of any
element that matched your label was, so you could use that to modulate the
confidence value. The default confidence level is `0.2`.

### Element Discovery Modes

There are two ways that this plugin can attempt to find elements:

1. The default mode uses Appium to get a list of all leaf-node elements, and
   can be specified by setting the `testaiFindMode` capability to
   `element_lookup`. Images of these elements are collected and sent to the
   test.ai classifier for labeling. Matched elements are returned to your test
   script as full-blown `WebElement`s, just as if you were using any of the
   standard Appium locator strategies.
2. The alternative mode takes a single screenshot, and uses an object detection
   network to attempt to identify screen regions of interest. These regions are
   then sent into the classifier for labeling. Matched regions are returned to
   your test script as Appium ImageElements (meaning that all you can do with
   them is click/tap them). This mode can be specified by setting the
   `testaiFindMode` capability to `object_detection`. By default, no output is logged from the native object detection code (apart from what TensorFlow itself does), but this can be turned on by setting the `testaiObjDetectionDebug` capability to `true`.

Each of these modes comes with different benefits and drawbacks:

#### Pros/cons of `element_lookup` mode

Element lookup mode returns full-blown elements to your test script, which
means you can perform any standard actions on them. However, leaf-node elements
are not always easy for the classifier to label. For example, in iOS it is
common to have a single element with both an icon and text as part of the
element, and this kind of element will never be labeled with high confidence.
Element lookup mode is also especially slow in cases where there are many
elements.

#### Pros/cons of `object_detection` mode

Object detection mode is not limited to actual UI elements, as it deals only
with an image of the screen. So, it can accurately find icons to label even if
those icons are mixed with other content in their UI element form. Object
detection is currently slow, but in principle it is faster (at least in the
limit) than element lookup mode. The main drawback is that elements returned to
your script are really just representations of screen regions, not full-blown
UI elements. So all that can be done with them is clicking/tapping them (of
course, that's typically all you would do with an icon anyway).

Currently, detecting objects in a screenshot is quite slow.

Object detection mode relies on C/C++ code which is built on install. This
code is portable but may not compile on some systems.

### Model Download

The TensorFlow network used to run the object detection strategy is provided as a free download by Test.ai, and downloaded automatically on install. If something goes wrong or you want to download it manually, you can run:

```
node ./build-js/lib/download.js
```

This will not re-download the model if the MD5 hash of the model online matches what is currently downloaded.

## Classifier Server

While the functionality provided by this project is available as a plugin for
direct use with Appium, it can also be used for arbitrary purposes. In this
fashion, it must be run as a server, which accepts connections from a client
written in a number of languages. These clients can ask the server to classify
images. The clients also make available a method which takes a Selenium driver
object and finds elements matching a label.

### Server Usage

```
test-ai-classifier -h <HOST> -p <PORT>
```

The default host is `127.0.0.1` and the default port is `50051`.

For information on how to use the clients to take advantage of the server's functionality, see the repositories for each of them:

* [Java client](https://github.com/testdotai/classifier-client-java)
* [Python client](https://github.com/testdotai/classifier-client-python)
* [Node client](https://github.com/testdotai/classifier-client-node)
* [Ruby client](https://github.com/testdotai/classifier-client-ruby)

There are some limitations to how the Selenium support works, because it relies
on the `getElementScreenshot` functionality, which is not yet supported well by
all the major browsers. (In my testing, Chrome was the most reliable).

## Development

There are some tests, but they must be run ad hoc. See the tests themselves for
assumptions.
