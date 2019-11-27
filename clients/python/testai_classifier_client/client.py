import grpc
from classifier_pb2 import ElementClassificationRequest
from classifier_pb2_grpc import ClassifierStub


DEFAULT_CONFIDENCE = 0.2


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
        print(ret_dict)
        return ret_dict
