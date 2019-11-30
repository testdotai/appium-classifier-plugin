# Test.ai Classifier - Ruby Client

The code in this directory defines a client library for use with the gRPC-based Test.ai classifier server located in the main directory of this repo.

## Installation & Setup

```
gem install testai_classifier
```

## Usage

This package exposes a `ClassifierClient` class, which you can instantiate with the host and port the classification server is running on:

```rb
require 'testai_classifier'

# ...

client = ClassifierClient.new(host, port)
```

You can use the client to attempt to match images to a semantic label:

```rb
# assume cart_img and menu_img are byte strings as delivered by
# File.read(filename).b

# define a mapping between ids and image data
data = {cart: cart_img, menu: menu_img}

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
# {cart: {label: 'cart', confidence: 0.9, confidence_for_hint: 0.9},
#  menu: {label: 'menu', confidence: 0.9, confidence_for_hint: 0.2}}
```

You can also use it in conjunction with a Selenium Python client driver object, to find elements in a web page based on the label:

```rb
@driver.navigate.to "https://test.ai"
els = @client.find_elements_matching_label(@driver, 'twitter')
els[0].click
_(@driver.current_url).must_equal 'https://twitter.com/testdotai'
```

## Development

* `make install` - install deps (requires Bundler)
* `make protogen` - generate python client helpers from .proto file (if this is done, the require for classifier_services_pb.rb must be updated to become relative).
* `make clean` - reset generated files
* `make gem` - build a gem from the project
* `make test` - run test suite (also `make unit-test` and `make se-test`)
* `make publish` - publish to rubygems
