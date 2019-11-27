def test_can_use_selenium_to_find_elements_matching_label(client, driver):
    driver.get("https://test.ai")
    els = client.find_elements_matching_label(driver, "twitter")
    els[0].click()
    assert driver.current_url == "https://twitter.com/testdotai"
