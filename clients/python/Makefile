.PHONY: protogen clean

protogen: .make.protogen

clean:
	rm .make.*

.make.protogen:
	pipenv run python -m grpc_tools.protoc --proto_path ../.. --python_out=. --grpc_python_out=. ../../classifier.proto
	touch .make.protogen

