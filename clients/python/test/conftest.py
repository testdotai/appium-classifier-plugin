import pytest
from os import path
from testai_classifier_client.client import ClassifierClient


HOST = 'localhost'
PORT = 50051
FX_DIR = path.join(path.dirname(path.realpath(__file__)), 'fixtures')


@pytest.fixture(scope='package')
def client():
    c = ClassifierClient(HOST, PORT)
    yield c
    c.close()


def get_img_data(name):
    filepath = path.join(FX_DIR, f'{name}.png')
    with open(filepath, mode='rb') as f:
        return f.read()


@pytest.fixture(scope='package')
def cart_img():
    return get_img_data('cart')


@pytest.fixture(scope='package')
def menu_img():
    return get_img_data('menu')
