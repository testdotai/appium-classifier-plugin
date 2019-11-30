require 'selenium-webdriver'
require 'testai_classifier/classifier_services_pb'
require 'testai_classifier/extensions'

# Selenium Ruby client doesn't currently implement the 'take element
# screenshot' command, so we have to patch it in
Selenium::WebDriver::Element.include WebDriverExtensions::Element
Selenium::WebDriver::Remote::Bridge.include WebDriverExtensions::Bridge

DEF_CONFIDENCE = 0.2
QUERY = "//body//*[not(self::script) and not(self::style) and not(child::*)]"

class ClassifierClient
    def initialize(host, port)
        @stub = Classifier::Stub.new("#{host}:#{port}", :this_channel_is_insecure)
    end

    def classify_images(label, element_images, confidence=DEF_CONFIDENCE,
                        allow_weaker_matches=false)
        ecr = ElementClassificationRequest
        req = ecr.new(labelHint: label, 
                      elementImages: element_images,
                      confidenceThreshold: confidence, 
                      allowWeakerMatches: allow_weaker_matches)
        resp = @stub.classify_elements(req)
        ret = {}
        resp.classifications.each do |id, cls|
            ret[id] = {
                :label => cls.label, 
                :confidence => cls.confidence,
                :confidence_for_hint => cls.confidenceForHint
            }
        end
        return ret
    end

    def find_elements_matching_label(driver, label, confidence=DEF_CONFIDENCE, allow_weaker_matches=false)
        els = driver.find_elements(:xpath, QUERY)
        element_images = {}
        els.each do |el|
            begin
                element_images[el.ref] = el.screenshot
            rescue
            end
        end
        if element_images.size < 1
            raise "Could not find any screenshots for leaf node elements"
        end
        matched = self.classify_images(label, element_images, confidence,
                                       allow_weaker_matches)
        return els.select {|el| matched.has_key? el.ref}
    end
end
