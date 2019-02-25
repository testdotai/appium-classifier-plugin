#include <iostream>
#include <fstream>
#include <napi.h>
#include <math.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"
#include "tf_utils.h"

struct DetectResponse {
    int status;
    const char* message;
};

struct ImageBuffer {
    char* buffer;
    int buffer_len;
};

void Deallocator(void* data, size_t size, void* arg) {
  TF_DeleteTensor((TF_Tensor *)data);
  *(int*)arg = 1;
}

// char* DataTypes[] = {
//   "TF_FLOAT",
//   "TF_DOUBLE",
//   "TF_INT32",
//   "TF_UINT8",
//   "TF_INT16",
//   "TF_INT8",
//   "TF_STRING",
//   "TF_COMPLEX64",
//   "TF_COMPLEX",
//   "TF_INT64",
//   "TF_BOOL",
//   "TF_QINT8",
//   "TF_QUINT8",
//   "TF_QINT32",
//   "TF_BFLOAT16",
//   "TF_QINT16",
//   "TF_QUINT16",
//   "TF_UINT16",
//   "TF_COMPLEX128",
//   "TF_HALF",
//   "TF_RESOURCE",
//   "TF_VARIANT",
//   "TF_UINT32",
//   "TF_UINT64",
// };

ImageBuffer readFile(const char* file) {
    std::ifstream image(file, std::ifstream::binary);

    if (!image) {
        return {"", -1};
    }

    image.seekg(0, image.end);
    int len = image.tellg();
    image.seekg(0, image.beg);

    std::cout << "about to create char array of " << len << " bytes" << std::endl;

    char* buf = new char[len];
    image.read(buf, len);
    return {buf, len};
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

    if (TF_GetCode(status) != TF_OK) {
        res.message = std::strcat("Could not load saved model. Message was: ", TF_Message(status));
        TF_DeleteStatus(status);
        return res;
    }

    std::cout << "session loaded" << std::endl;

    TF_Output input = {TF_GraphOperationByName(graph, "encoded_image_string_tensor"), 0};
    if (input.oper == nullptr) {
        res.message = "Could not init input oper";
        return res;
    }
    std::cout << "expected dims of encoded_image_string_tensor: " << TF_GraphGetTensorNumDims(graph, input, status) << std::endl;

    std::cout << "image path is: " << img_path << std::endl;
    ImageBuffer image = readFile(img_path);
    if (image.buffer_len == -1) {
        res.message = "Could not read image data at path provided";
        TF_DeleteStatus(status);
        return res;
    }
    std::cout << "image data is: " << image.buffer_len << " bytes long" << std::endl;
    int tensor_byte_offset = 8;
    size_t encoded_size = TF_StringEncodedSize(image.buffer_len);
    size_t total_size = encoded_size + tensor_byte_offset;
    char encoded_image[total_size];
    for (int i = 0; i < tensor_byte_offset; i++) {
        encoded_image[i] = 0;
    }
    TF_StringEncode(image.buffer, image.buffer_len, encoded_image + tensor_byte_offset, encoded_size, status);

    if (TF_GetCode(status) != TF_OK) {
        res.message = std::strcat("Could not encode image data. Message was: ", TF_Message(status));
        TF_DeleteStatus(status);
        return res;
    }

    std::cout << "constructing tensor from image data" << std::endl;

    const int64_t dims[1] = {1};
    TF_Tensor* const input_tensor = TF_NewTensor(TF_STRING, dims, 1, encoded_image, total_size, &Deallocator, 0);
    // memset(TF_TensorData(input_tensor), 0, tensor_byte_offset);
    std::cout << "tensor has " << TF_NumDims(input_tensor) << " dims, and length " << TF_Dim(input_tensor, 0) << " in the 0th dim" << std::endl;
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
        outputs.push_back(output);
    }
    std::vector<TF_Tensor*> output_values(4);

    std::cout << "running session" << std::endl;

    TF_SessionRun(sess, nullptr, inputs, input_values, 1, outputs.data(), output_values.data(), 4, nullptr, 0, nullptr, status);

    if (TF_GetCode(status) != TF_OK) {
        std::cout << "error running session: " << TF_GetCode(status) << " " << TF_Message(status) << std::endl;
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
        res.message = "Could not delete TF session cleanly";
        return res;
    }

    for (TF_Tensor* tensor : output_values) {
        int dims = TF_NumDims(tensor);
        std::string shape = "[";
        for (int j = 0; j < dims; j++) {
            shape = shape.append(std::to_string(TF_Dim(tensor, j))).append(", ");
        }
        shape = shape.append("]");
        std::cout << "Shape for tensor: " << shape << std::endl;
    }

    const int num_detections = TF_Dim(output_values[0], 1);

    const auto boxes_data = static_cast<float*>(TF_TensorData(output_values[0]));
    const auto scores_data = static_cast<float*>(TF_TensorData(output_values[1]));
    const auto classes_data = static_cast<int*>(TF_TensorData(output_values[2]));

    float boxes[num_detections][4];
    for (int i = 0; i < num_detections; i++) {
        int idx = floor(i / 4);
        boxes[idx][i % 4] = boxes_data[i];
        std::cout << boxes_data[i] << " ";
        if (i % 4 == 3) {
            std::cout << std::endl;
        }
    }

    for (int i = 0; i < num_detections; i++) {
        if (scores_data[i] > 0.95) {
            std::cout << "Found entity with score of: " << scores_data[i] << ". Its % bounds are: [" << boxes[i][1] << ", " << boxes[i][0] << "] -> [" << boxes[i][3] << ", " << boxes[i][2] << "]" << std::endl;
        }
    }

    // Napi::ArrayBuffer boxes_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[0]), 8);
    // Napi::ArrayBuffer scores_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[1]), 8);
    // Napi::ArrayBuffer classes_array = Napi::ArrayBuffer::New(env, TF_TensorData(output_values[2]), 8);

    // clean everything up
    // TF_DeleteTensor(input_tensor);
    // for (TF_Tensor* tensor : output_values) {
    //     TF_DeleteTensor(tensor);
    // }
    // TF_DeleteGraph(graph);
    // TF_DeleteStatus(status);

    res.status = 0;
    res.message = "OK";
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

    std::cout << "done detecting" << std::endl;

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