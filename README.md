# Test.ai Classifier Plugin for Appium

This is an experimental plugin for [Appium](https://appium.io) that enables
test automation of mobile apps using [Test.ai](https://test.ai)'s
machine-learning element type classifier. It allows you to find Appium elements
using a semantic label (like "cart" or "microphone" or "arrow") instead of
having to dig through your app hierarchy. The same labels can be used to find
elements with the same general shape across different apps and different visual
designs.

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

TBD (not yet tested or supported)

### Windows

TBD (not yet tested or supported)

## Appium Setup

Appium's element finding plugin feature is experimental, so you will need to be
using Appium version 1.9.2-beta.2 at a minimum.

## Classifier Setup

To make this plugin available to Appium, simply go to the main Appium repo, and
run `npm install test-ai-classifier` to install this plugin into Appium's
dependency tree and make it available.

Otherwise, install it somewhere on your filesystem and use an absolute path as
the module name (see below).

## Usage

Element finding plugins are made available via a special locator strategy,
`-custom`. To tell Appium which plugin to use when this locator strategy is
requested, send in the module name and a selector shortcut as the
`customFindModules` capability. For example, to use this plugin, set the
`customFindModules` capability to something like `{"ai": "test-ai-classifier"}`
(here `ai` is the "selector shortcut" and `test-ai-classifier` is the "module
name"). This will enable access to the plugin when using selectors of the form
`ai:foo`.

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

### Match confidence

Using the `testaiConfidenceThreshold` capability, you can set a confidence
threshold below which the plugin will refuse to consider elements as matching
your label. This capability should be a number between 0 and 1, where 1 means
confidence must be perfect, and 0 means no confidence at all is required.

This is a useful capability to set after reading the Appium logs from a failed
element find; this plugin will tell you what the highest confidence of any
element that matched your label was, so you could use that to modulate the
confidence value. The default confidence level is `0.2`.

## Development

There are some tests, but they must be run ad hoc. See the tests themselves for
assumptions.
