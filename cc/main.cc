#include <iostream>
#include <fstream>
#include <napi.h>
#include <math.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

struct DetectResponse {
    int status;
    const char* message;
    Napi::Array detected;
};

struct ImageBuffer {
    char* buffer;
    int bufferLen;
};

void Deallocator(void* data, size_t size, void* arg) {
  TF_DeleteTensor((TF_Tensor *)data);
  *(int*)arg = 1;
}

void PrintTensorDims(std::vector<TF_Tensor*> tensors) {
    for (TF_Tensor* tensor : tensors) {
        int dims = TF_NumDims(tensor);
        std::string shape = "[";
        for (int j = 0; j < dims; j++) {
            shape = shape.append(std::to_string(TF_Dim(tensor, j))).append(", ");
        }
        shape = shape.append("]");
        std::cout << "Shape for tensor: " << shape << std::endl;
    }
}

// Get a data buffer from reading an image file
ImageBuffer readFile(const char* file) {
    std::ifstream image(file, std::ifstream::binary);

    if (!image) {
        return {"", -1};
    }

    image.seekg(0, image.end);
    int len = image.tellg();
    image.seekg(0, image.beg);

    char* buf = new char[len];
    image.read(buf, len);
    return {buf, len};
}

DetectResponse detectErrorWithStatus(const char* msg, TF_Status* status, Napi::Env env) {
    DetectResponse res;
    res.status = -1;
    res.detected = Napi::Array::New(env);
    res.message = std::strcat(std::strcat(msg, " Message was:"), TF_Message(status));
    TF_DeleteStatus(status);
    return res;
}

DetectResponse detectError(const char* msg, Napi::Env env) {
    DetectResponse res;
    res.status = -1;
    res.detected = Napi::Array::New(env);
    res.message = msg;
    return res;
}

void getEncodedImageData(const char* imgPath, size_t* totalSize, char* encodedImage) {
    
}

TF_Tensor* constructInputTensor() {

}

DetectResponse detectFromModel(const char* modelPath, const char* imgPath, float detectThreshold, Napi::Env env) {

    TF_Graph* graph = TF_NewGraph();
    TF_Status* status = TF_NewStatus();
    const char* tags[] = {"serve"};
    TF_SessionOptions* options = TF_NewSessionOptions();
    TF_Session* sess = TF_LoadSessionFromSavedModel(options, nullptr, modelPath, tags, 1, graph, nullptr, status);
    TF_DeleteSessionOptions(options);

    if (TF_GetCode(status) != TF_OK) {
        return detectErrorWithStatus("Could not load saved model.", status, env);
    }

    std::cout << "session loaded" << std::endl;

    TF_Output input = {TF_GraphOperationByName(graph, "encoded_image_string_tensor"), 0};
    if (input.oper == nullptr) {
        return detectError("Could not init input oper", env);
    }
    std::cout << "expected dims of encoded_image_string_tensor: " << TF_GraphGetTensorNumDims(graph, input, status) << std::endl;

    std::cout << "image path is: " << imgPath << std::endl;
    ImageBuffer image = readFile(imgPath);
    if (image.bufferLen == -1) {
        return detectErrorWithStatus("Could not read image data at path provided", status, env);
    }
    std::cout << "image data is: " << image.bufferLen << " bytes long" << std::endl;
    int tensorByteOffset = 8;
    size_t encodedSize = TF_StringEncodedSize(image.bufferLen);
    size_t totalSize = encodedSize + tensorByteOffset;
    char encodedImage[totalSize];
    for (int i = 0; i < tensorByteOffset; i++) {
        encodedImage[i] = 0;
    }
    TF_StringEncode(image.buffer, image.bufferLen, encodedImage + tensorByteOffset, encodedSize, status);

    if (TF_GetCode(status) != TF_OK) {
        return detectErrorWithStatus("Could not encode image data", status, env);
    }

    std::cout << "constructing tensor from image data" << std::endl;

    const int64_t dims[1] = {1};
    TF_Tensor* const input_tensor = TF_NewTensor(TF_STRING, dims, 1, encodedImage, totalSize, &Deallocator, 0);
    // memset(TF_TensorData(input_tensor), 0, tensorByteOffset);
    std::cout << "tensor has " << TF_NumDims(input_tensor) << " dims, and length " << TF_Dim(input_tensor, 0) << " in the 0th dim" << std::endl;
    if (input_tensor == nullptr) {
        return detectError("Could not init image input tensor", env);
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
            return detectError(message.c_str(), env);
        }
        outputs.push_back(output);
    }
    std::vector<TF_Tensor*> output_values(4);

    std::cout << "running session" << std::endl;

    TF_SessionRun(sess, nullptr, inputs, input_values, 1, outputs.data(), output_values.data(), 4, nullptr, 0, nullptr, status);

    if (TF_GetCode(status) != TF_OK) {
        std::cout << "error running session: " << TF_GetCode(status) << " " << TF_Message(status) << std::endl;
        return detectErrorWithStatus("Could not run TF session", status, env);
    }

    TF_CloseSession(sess, status);

    if (TF_GetCode(status) != TF_OK) {
        return detectErrorWithStatus("Could not close TF session cleanly", status, env);
    }

    TF_DeleteSession(sess, status);
    if (TF_GetCode(status) != TF_OK) {
        return detectErrorWithStatus("Could not delete TF session cleanly", status, env);
    }

    DetectResponse res;

    const int num_detections = TF_Dim(output_values[0], 1);

    const auto boxes_data = static_cast<float*>(TF_TensorData(output_values[0]));
    const auto scores_data = static_cast<float*>(TF_TensorData(output_values[1]));
    const auto classes_data = static_cast<int*>(TF_TensorData(output_values[2]));

    float boxes[num_detections][4];
    for (int i = 0; i < num_detections; i++) {
        int idx = floor(i / 4);
        boxes[idx][i % 4] = boxes_data[i];
    }

    int good_detections = 0;
    for (int i = 0; i < num_detections; i++) {
        if (scores_data[i] >= detectThreshold) {
            std::cout << "Found entity with score of: " << scores_data[i] << ". Its % bounds are: [" << boxes[i][1] << ", " << boxes[i][0] << "] -> [" << boxes[i][3] << ", " << boxes[i][2] << "]" << std::endl;
            Napi::Object detection = Napi::Object::New(env);
            detection.Set("confidence", scores_data[i]);
            detection.Set("ymin", boxes[i][0]);
            detection.Set("xmin", boxes[i][1]);
            detection.Set("ymax", boxes[i][2]);
            detection.Set("xmax", boxes[i][3]);

            res.detected.Set(good_detections, detection);
            good_detections++;
        }
    }

    for (TF_Tensor* tensor : output_values) {
        TF_DeleteTensor(tensor);
    }
    TF_DeleteGraph(graph);
    TF_DeleteStatus(status);

    res.status = 0;
    res.message = "OK";
    return res;
}

Napi::Value Detect(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info.Length() != 3) {
        Napi::TypeError::New(env, "You need to pass in the path to a TF model, a path to the image to detect in, and a detection threshold (0-1)").ThrowAsJavaScriptException();
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
    if (!info[2].IsNumber()) {
        Napi::TypeError::New(env, "Threshold should be a number").ThrowAsJavaScriptException();
        return env.Null();
    }
    Napi::String modelPath = info[0].As<Napi::String>();
    Napi::String imgPath = info[1].As<Napi::String>();
    Napi::Number detectThreshold = info[2].As<Napi::Number>();
    
    DetectResponse res = detectFromModel(modelPath.Utf8Value().c_str(), imgPath.Utf8Value().c_str(), detectThreshold.FloatValue(), env);

    std::cout << "done detecting" << std::endl;

    if (res.status == 0) {
        return res.detected;
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