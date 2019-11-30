Gem::Specification.new do |s|
  s.name        = 'testai_classifier'
  s.version     = '1.0.0'
  s.date        = '2019-11-29'
  s.summary     = "A client to the Test.ai + Appium Classifier server"
  s.description = "The test.ai image classification RPC server can listen for requests from this client in order to classify images and even use a Selenium client object to find elements in a webpage matching a certain label"
  s.authors     = ["Jonathan Lipps"]
  s.email       = 'jlipps@cloudgrey.io'
  s.files       = [
      "lib/testai_classifier.rb",
      "lib/testai_classifier/classifier_pb.rb",
      "lib/testai_classifier/classifier_services_pb.rb",
      "lib/testai_classifier/extensions.rb",
  ]
  s.homepage    = 'https://github.com/testdotai/appium-classifier-plugin'
  s.license     = 'Apache-2.0'
  s.add_runtime_dependency 'grpc', '~> 1.25'
  s.add_runtime_dependency 'selenium-webdriver', '~> 3.142'
  s.add_development_dependency 'grpc-tools', '~> 1.25'
  s.add_development_dependency 'minitest', '~> 5.13'
end
