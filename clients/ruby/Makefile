.PHONY: install protogen clean test gem publish

install:
	bundle install

protogen: .make.protogen

clean:
	rm -rf .make.*
	rm -rf *.gem

test:
	bundle exec ruby -Ilib:specs specs/client_specs.rb

unit-test:
	bundle exec ruby -Ilib:specs specs/client_specs.rb --name "/classify some images/"

se-test:
	bundle exec ruby -Ilib:specs specs/client_specs.rb --name "/driver/"

gem: .make.gem

publish: gem
	gem push *.gem 

.make.protogen:
	grpc_tools_ruby_protoc -I ../.. --ruby_out=./lib --grpc_out=./lib ../../classifier.proto
	touch .make.protogen

.make.gem:
	gem build testai_classifier.gemspec
	touch .make.gem
