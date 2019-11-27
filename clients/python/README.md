# Test.ai Classifier - Python Client

The code in this directory defines a client library for use with the gRPC-based Test.ai classifier server located in the main directory of this repo.

## Installation & Setup

```
pip install testai_classifier
```

## Usage

This package exposes a `ClassifierClient` class:

```py
from testai_classifier import ClassifierClient
```

You can use it to attempt to match images to a semantic label:

```py
def classify():
    client = ClassifierClient(HOST, PORT)
    # assume cart_img and menu_img are byte streams as delivered by file.read()
    # define a mapping between ids and image data
    data = {'cart': cart_img, 'menu': menu_img}

    # define which label we are looking to match
    label = 'cart'

    # attempt to match the images with the label
    # confidence is from 0.0 to 1.0 -- any matches with lower than the specified
    # confidence are not returned.
    # allow_weaker_matches specifies whether to return matches that are above
    # the confidence threshold but whose most confident match was a *different*
    # label
    res = client.classify_images(label, data, confidence=0.0, allow_weaker_matches=True)

    # res looks like:
    # {'cart': {'label': 'cart', 'confidence': 0.9, 'confidence_for_hint': 0.9},
    #  'menu': {'label': 'menu', 'confidence': 0.9, 'confidence_for_hint': 0.2}}

    # always close the client connection
    client.close()
```

You can also use it in conjunction with a Selenium Python client driver object, to find elements in a web page based on the label:

```py
def find_elements():
    client = ClassifierClient(HOST, PORT)

    driver.get("https://test.ai")
    els = client.find_elements_matching_label(driver, "twitter")
    els[0].click()
    assert driver.current_url == "https://twitter.com/testdotai"

    client.close()
```

## Development

* `make install` - install deps (requires Pipenv)
* `make protogen` - generate python client helpers from .proto file
* `make clean` - reset generated files
* `make build` - run setup.py to generate publishable files
* `make test` - run test suite (also `make unit-test` and `make se-test`)
* `make publish` - publish to pypi (also `make publish-test`)
