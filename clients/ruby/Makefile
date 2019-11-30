.PHONY: install protogen clean test

install:
	bundle install

protogen: .make.protogen

clean:
	rm -rf .make.*
	rm -rf dist build *.egg-info

test:
	bundle exec ruby -Ilib:test specs/client_specs.rb

unit-test:
	bundle exec ruby -Ilib:test specs/client_specs.rb --name "/classify some images/"

se-test:
	bundle exec ruby -Ilib:test specs/client_specs.rb --name "/driver/"

.make.protogen:
	grpc_tools_ruby_protoc -I ../.. --ruby_out=./lib --grpc_out=./lib ../../classifier.proto
	touch .make.protogen
