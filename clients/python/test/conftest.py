import pytest
from os import path
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from testai_classifier_client.client import ClassifierClient


HOST = 'localhost'
PORT = 50051
FX_DIR = path.join(path.dirname(path.realpath(__file__)), 'fixtures')
SEL_CE = 'http://localhost:4444/wd/hub'


@pytest.fixture(scope='package')
def client():
    c = ClassifierClient(HOST, PORT)
    yield c
    c.close()


@pytest.fixture(scope='function')
def driver():
    driver = webdriver.Remote(command_executor=SEL_CE,
                              desired_capabilities=DesiredCapabilities.CHROME)
    yield driver
    driver.quit()


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
