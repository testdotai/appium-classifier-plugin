.PHONY: protogen clean test

protogen: .make.protogen

clean:
	rm .make.*

test:
	pipenv run pytest ./test/test_*.py

build: .make.build

.make.protogen:
	pipenv run python -m grpc_tools.protoc --proto_path ../.. --python_out=. --grpc_python_out=. ../../classifier.proto
	touch .make.protogen

.make.build:
	pipenv run python setup.py sdist bdist_wheel
	touch .make.build
