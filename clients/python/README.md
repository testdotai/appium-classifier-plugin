# Test.ai Classifier - Python Client

The code in this directory defines a client library for use with the gRPC-based Test.ai classifier server located in the main directory of this repo.

## Development

* `pipenv install` - install deps (requires Pipenv)
* `make protogen` - generate python client helpers from .proto file
* `make clean` - reset generated files
* `make test` - run test suite
