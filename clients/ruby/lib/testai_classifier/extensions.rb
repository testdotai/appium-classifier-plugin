module WebDriverExtensions
    module Element
        def screenshot()
            data = bridge.take_element_screenshot @id
            data.unpack1 'm'
        end
    end

    module Bridge
        def take_element_screenshot(element)
            execute :take_element_screenshot, {id: element}
        end
    end
end
