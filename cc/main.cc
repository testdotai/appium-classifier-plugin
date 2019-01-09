#include <iostream>
#include <fstream>
#include <napi.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"
#include "tf_utils.h"

struct DetectResponse {
    int status;
    const char* message;
};

std::string readFile(const char* file) {
    std::ifstream ifs(file);
    std::string data = std::string(std::istreambuf_iterator<char>(ifs), std::istreambuf_iterator<char>());
    return data;
}

DetectResponse detectFromModel(const char* model_path, const char* img_path) {
    DetectResponse res;
    res.status = -1;

    std::cout << "model path is: " << model_path << std::endl;

    TF_Graph* graph = TF_NewGraph();
    TF_Status* status = TF_NewStatus();
    const char* tags[] = {"serve"};
    TF_SessionOptions* options = TF_NewSessionOptions();
    TF_Session* sess = TF_LoadSessionFromSavedModel(options, nullptr, model_path, tags, 1, graph, nullptr, status);
    TF_DeleteSessionOptions(options);

    std::cout << "session loaded" << std::endl;

    TF_Output input = {TF_GraphOperationByName(graph, "encoded_image_string_tensor"), 0};
    if (input.oper == nullptr) {
        res.message = "Could not init input oper";
        return res;
    }

    std::cout << "image path is: " << img_path << std::endl;
    std::string img_data = readFile(img_path);
    std::cout << "image data is: " << img_data.length() << std::endl;
    std::vector<int64_t> dims(1, 1);
    std::vector<std::string> data(1, img_data);
    TF_Tensor* const input_tensor = tf_utils::CreateTensor(TF_STRING, dims, data);
    if (input_tensor == nullptr) {
        res.message = "Could not init image input tensor";
        return res;
    }
    TF_Output inputs[] = {input};
    TF_Tensor* input_values[] = {input_tensor};

    std::vector<std::string> output_names = {
        "detection_boxes", 
        "detection_scores", 
        "detection_classes", 
        "num_detections"
    };
    std::vector<TF_Output> outputs;
    for (std::string name : output_names) {
        TF_Output output = {TF_GraphOperationByName(graph, name.c_str()), 0};
        if (output.oper == nullptr) {
            const std::string message = "Could not init output graph name " + name;
            res.message = message.c_str();
            return res;
        }
    }
    std::vector<TF_Tensor*> output_values(4);

    std::cout << "running session" << std::endl;

    TF_SessionRun(sess, nullptr, inputs, input_values, 1, outputs.data(), output_values.data(), 4, nullptr, 0, nullptr, status);

    if (TF_GetCode(status) != TF_OK) {
        std::cout << "error running session: " << TF_GetCode(status) << std::endl;
        TF_DeleteStatus(status);
        res.message = "Could not run TF session";
        return res;
    }

    TF_CloseSession(sess, status);

    if (TF_GetCode(status) != TF_OK) {
        TF_DeleteStatus(status);
        res.message = "Could not close TF session cleanly";
        return res;
    }

    TF_DeleteSession(sess, status);
    if (TF_GetCode(status) != TF_OK) {
        TF_DeleteStatus(status);
    }

    const auto boxes_data = static_cast<int*>(TF_TensorData(output_values[0]));
    const auto scores_data = static_cast<float*>(TF_TensorData(output_values[1]));
    const auto classes_data = static_cast<int*>(TF_TensorData(output_values[2]));

    std::cout << "Output vals: " << boxes_data[0] << ", " << boxes_data[1] << ", " << boxes_data[2] << ", " << boxes_data[3] << std::endl;

    // Napi::ArrayBuffer boxes_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[0]), 8);
    // Napi::ArrayBuffer scores_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[1]), 8);
    // Napi::ArrayBuffer classes_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[2]), 8);

    // clean everything up
    TF_DeleteTensor(input_tensor);
    for (TF_Tensor* tensor : output_values) {
        TF_DeleteTensor(tensor);
    }
    TF_DeleteGraph(graph);
    TF_DeleteStatus(status);

    return res;
}

Napi::Value Detect(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info.Length() != 2) {
        Napi::TypeError::New(env, "You need to pass in the path to a TF model, and the buffer image data").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!info[0].IsString()) {
        Napi::TypeError::New(env, "Path to TF model should be a string").ThrowAsJavaScriptException();
        return env.Null();
    }
    if (!info[1].IsString()) {
        Napi::TypeError::New(env, "Image path should be passed as a string").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::String model_path = info[0].As<Napi::String>();
    Napi::String img_path = info[1].As<Napi::String>();
    
    DetectResponse res = detectFromModel(model_path.Utf8Value().c_str(), img_path.Utf8Value().c_str());

    if (res.status == 0) {
        return Napi::String::New(env, "OK");
    }
    
    Napi::Error::New(env, res.message).ThrowAsJavaScriptException();
    return env.Null();
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "TF_VERSION"), Napi::String::New(env, TF_Version()));
    exports.Set(Napi::String::New(env, "detect"), Napi::Function::New(env, Detect));
    return exports;
}

NODE_API_MODULE(testaddon, Init)