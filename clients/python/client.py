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

