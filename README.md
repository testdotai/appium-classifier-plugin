# Test.ai Classifier Plugin for Appium

This is an experimental plugin for [Appium](https://appium.io) that enables
test automation of mobile apps using [Test.ai](https://test.ai)'s
machine-learning element type classifier. It allows you to find Appium elements
using a semantic label (like "cart" or "microphone" or "arrow") instead of
having to dig through your app hierarchy. The same labels can be used to find
elements with the same general shape across different apps and different visual
designs.

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

Appium's element finding plugin feature is experimental, so some manual configuration is required.

1. Clone the repositories for [appium](https://github.com/appium/appium), [appium-base-driver](https://github.com/appium/appium-base-driver), and any mobile OS driver you want to use this feature with (e.g., [appium-uiautomator2-driver](https://github.com/appium/appium-uiautomator2-driver).
2. In each repo, run `npm install` to get all the dependencies.
3. Apply [this patch](https://github.com/appium/appium-base-driver/pull/268) to appium-base-driver.
4. Inside appium-base-driver, run `npm run build && npm link` to transpile the patch and link the changes into the local NPM registry
5. Inside your mobile OS driver (e.g. appium-uiautomator2-driver), run `npm link appium-base-driver` to make the patched appium-base-driver active.
6. Inside the main appium repo, run `npm link appium-base-driver` and then also `npm link appium-uiautomator2-driver` to get the whole dependency tree registering the patched base-driver.
7. Inside the main appium repo, run `node .` to start the server
8. Your running server now has the ability to use element finding plugins like this one!

## Classifier Setup

To make this plugin available to Appium, simply go to the main Appium repo, and
run `npm install test-ai-classifier` to install this plugin into Appium's
dependency tree and make it available.

## Usage

Element finding plugins are made available via a special locator strategy,
`-custom`. To tell Appium which plugin to use when this locator strategy is
requested, send in the module name as the `customFindModule` capability. For
example, to use this plugin, set the `customFindModule` capability to
`test-ai-classifier`.

In your test, you can now make new findElement calls, for example:

```js
driver.findElement('-custom', 'cart');
```

The above command (which will differ for each Appium client, of course), will
use this plugin to find a shopping cart element on the screen.

## Development

There are some tests, but they must be run ad hoc. See the tests themselves for
assumptions.
