def test_can_classify_images_via_rpc_server(client, cart_img, menu_img):
    data = {'cart': cart_img, 'menu': menu_img}
    label = 'cart'
    res = client.classify_images(label, data, confidence=0.0, allow_weaker_matches=True)
    cart = res['cart']
    assert cart['label'] == 'cart'
    assert cart['confidence'] > 0.9
    assert cart['confidence'] < 1.0
    assert cart['confidence_for_hint'] > 0.9
    assert cart['confidence_for_hint'] < 1.0

    menu = res['menu']
    assert menu['label'] == 'menu'
    assert menu['confidence'] > 0.3
    assert menu['confidence'] < 0.5
    assert menu['confidence_for_hint'] > 0.0
    assert menu['confidence_for_hint'] < 0.1


def test_can_use_selenium_to_find_elements_matching_label(client, driver):
    driver.get("https://test.ai")
    els = client.find_elements_matching_label(driver, "twitter")
    els[0].click()
    assert driver.current_url == "https://twitter.com/testdotai"
