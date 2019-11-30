require 'testai_classifier'
require 'minitest/autorun'
require 'selenium-webdriver'

FX_DIR = File.join(File.expand_path(File.dirname(__FILE__)), "fixtures")

HOST = 'localhost'
PORT = 50051

def get_img_data(name)
    filename = File.join(FX_DIR, "#{name}.png")
    File.read(filename).b
end

describe ClassifierClient do
    before do
        @client = ClassifierClient.new(HOST, PORT)
        @menu = get_img_data "menu"
        @cart = get_img_data "cart"
    end

    describe "when asked to classify some images" do
        it "must provide correct labels and confidence results" do
            element_images = {menu: @menu, cart: @cart}
            resp = @client.classify_images("cart", element_images, 0.0, true)
            cart = resp["cart"]
            _(cart[:label]).must_equal "cart"
            _(cart[:confidence]).must_be :>, 0.9
            _(cart[:confidence]).must_be :<, 1.0
            _(cart[:confidence_for_hint]).must_be :>, 0.9
            _(cart[:confidence_for_hint]).must_be :<, 1.0

            menu = resp["menu"]
            _(menu[:label]).must_equal "menu"
            _(menu[:confidence]).must_be :>, 0.3
            _(menu[:confidence]).must_be :<, 0.5
            _(menu[:confidence_for_hint]).must_be :>, 0.0
            _(menu[:confidence_for_hint]).must_be :<, 0.1
        end
    end

    describe "when using a selenium driver to find matching elements" do
        before do
            @driver = Selenium::WebDriver.for :chrome
        end

        after do
            @driver.quit
        end

        it "must return the elements that match the label" do
            @driver.navigate.to "https://test.ai"
            els = @client.find_elements_matching_label(@driver, 'twitter')
            els[0].click
            _(@driver.current_url).must_equal 'https://twitter.com/testdotai'
        end
    end
end
