# enable absolute requires
this_dir = File.expand_path(File.dirname(__FILE__))
$LOAD_PATH.unshift(this_dir) unless $LOAD_PATH.include?(this_dir)

require 'classifier_services_pb'

DEF_CONFIDENCE = 0.2

class ClassifierClient
    def initialize(host, port)
        @stub = Classifier::Stub.new("#{host}:#{port}", :this_channel_is_insecure)
    end

    def classify_images(label, element_images, confidence=DEF_CONFIDENCE, allow_weaker_matches=false)
        req = ElementClassificationRequest.new(labelHint: label, elementImages: element_images,
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
    end
end
