import grpc
from classifier_pb2 import ElementClassificationRequest
from classifier_pb2_grpc import ClassifierStub


DEFAULT_CONFIDENCE = 0.2
QUERY = "//body//*[not(self::script) and not(self::style) and not(child::*)]"


class ClassifierClient(object):

    def __init__(self, host, port):
        self.channel = grpc.insecure_channel(f'{host}:{port}')

    def close(self):
        self.channel.close()

    def classify_images(self, label, element_images, confidence=DEFAULT_CONFIDENCE,
                        allow_weaker_matches=False):
        stub = ClassifierStub(self.channel)
        req = ElementClassificationRequest(labelHint=label,
                                           elementImages=element_images,
                                           confidenceThreshold=confidence,
                                           allowWeakerMatches=allow_weaker_matches)
        cs = stub.ClassifyElements(req).classifications
        ret_dict = {}
        for key in element_images.keys():
            classification = cs.get(key)
            if classification is not None:
                ret_dict[key] = {
                    'label': classification.label,
                    'confidence': classification.confidence,
                    'confidence_for_hint': classification.confidenceForHint,
                }
        return ret_dict

    def find_elements_matching_label(self, driver, label,
                                     confidence=DEFAULT_CONFIDENCE,
                                     allow_weaker_matches=False):
        els = driver.find_elements_by_xpath(QUERY)
        element_images = {}
        for el in els:
            try:
                element_images[el._id] = el.screenshot_as_png
            except Exception:
                pass
        if len(element_images) < 1:
            raise Exception("Could not find any screenshots for leaf node elements")
        matched = self.classify_images(label, element_images, confidence, allow_weaker_matches)
        return list(filter(lambda el: el._id in matched.keys(), els))
