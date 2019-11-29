.PHONY: install protogen clean test

install:
	bundle install

protogen: .make.protogen

clean:
	rm -rf .make.*
	rm -rf dist build *.egg-info

test:
	bundle exec ruby -Ilib:test specs/client_specs.rb

.make.protogen:
	grpc_tools_ruby_protoc -I ../.. --ruby_out=./lib --grpc_out=./lib ../../classifier.proto
	touch .make.protogen
