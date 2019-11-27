.PHONY: protogen clean test build se-test unit-test publish publish-test install

install:
	pipenv install

protogen: .make.protogen

clean:
	rm -rf .make.*
	rm -rf dist build *.egg-info

unit-test:
	pipenv run pytest ./test/test_client.py

se-test:
	pipenv run pytest ./test/test_client_selenium.py

test: unit-test se-test

build: .make.build

publish-test:
	pipenv run twine upload --repository-url https://test.pypi.org/legacy/ dist/*

publish:
	pipenv run twine upload dist/*

.make.protogen:
	pipenv run python -m grpc_tools.protoc --proto_path ../.. --python_out=. --grpc_python_out=. ../../classifier.proto
	touch .make.protogen

.make.build:
	pipenv run python setup.py sdist bdist_wheel
	touch .make.build
