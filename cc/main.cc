#include <iostream>
#include <fstream>
#include <napi.h>
#include <math.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

struct DetectResponse {
    int status;
    std::string message;
    Napi::Array detected;
};

struct ImageBuffer {
    char* buffer;
    int bufferLen;
};

struct SessionArgs {
    std::vector<TF_Output> inputs;
    std::vector<TF_Tensor*> inputValues;
    std::vector<TF_Output> outputs;
    std::vector<TF_Tensor*> outputValues;
};

struct DetectionData {
    int numDetections;
    std::vector<float> boxes;
    std::vector<float> scores;
};

void Deallocator(void* data, size_t size, void* arg) {
  TF_DeleteTensor((TF_Tensor *)data);
  *(int*)arg = 1;
}

void printTensorDims(std::vector<TF_Tensor*> tensors) {
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

class Detection {
    public:
        Detection (std::string modelPath, std::string imgPath, float detectThreshold);
        void detect ();
        DetectResponse getDetectResponse (Napi::Env env);

    private:
        TF_Graph* graph;
        TF_Status* status;
        TF_Session* session;
        float detectThreshold;
        std::string modelPath;
        std::string imgPath;
        DetectionData data;
        DetectResponse response;
        char* encodedImage;
        int totalImgSize;
        TF_Tensor* imageTensor;
        SessionArgs sessionArgs;

        bool initSession ();
        bool setError(std::string msg);
        bool setErrorWithStatus (std::string msg);
        bool setImageTensor ();
        bool initOperations();
        bool runSession();
        void cleanup();
        Napi::Array buildNodeValues(Napi::Env env);
};

Detection::Detection (std::string modelPath, std::string imgPath, float detectThreshold) {
    this->modelPath = modelPath;
    this->imgPath = imgPath;
    this->detectThreshold = detectThreshold;
    response.status = -1; // set the detection status to failed by default
}

void Detection::detect () {
    if (!initSession()) return;
    if (!initOperations()) return;
    if (!runSession()) return;
    cleanup();
}

bool Detection::initSession () {
    // set up the tensorflow graph and status containers
    graph = TF_NewGraph();
    status = TF_NewStatus();

    // initialize a tensorflow session
    std::vector<const char*> tags = {"serve"};
    TF_SessionOptions* options = TF_NewSessionOptions();
    session = TF_LoadSessionFromSavedModel(options, nullptr, modelPath.c_str(), tags.data(), 1, graph, nullptr, status);
    TF_DeleteSessionOptions(options);

    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not load saved model.");
    }

    return true;
}

bool Detection::setErrorWithStatus(std::string msg) {
    response.message = msg + " Message was: " + TF_Message(status);
    TF_DeleteStatus(status);
    return false;
}

bool Detection::setError(std::string msg) {
    response.message = msg;
    return false;
}

bool Detection::setImageTensor() {
    ImageBuffer image = readFile(imgPath.c_str());
    if (image.bufferLen == -1) {
        return setError("Could not read image data at path provided.");
    }
    std::cout << "image data is: " << image.bufferLen << " bytes long" << std::endl;

    // TF requires that the image data start 8 bytes into the char array
    int tensorByteOffset = 8;

    // get the size that TF thinks our image data will take up
    size_t encodedSize = TF_StringEncodedSize(image.bufferLen);

    // the total size will be that plus the magic byte offset length
    size_t totalSize = encodedSize + tensorByteOffset;

    // zero out the first magic bytes
    char encodedImage[totalSize];
    for (int i = 0; i < tensorByteOffset; i++) {
        encodedImage[i] = 0;
    }

    // direct TF to encode our image data into the encodedImage var
    TF_StringEncode(image.buffer, image.bufferLen, encodedImage + tensorByteOffset, encodedSize, status);

    if (TF_GetCode(status) != TF_OK) {
        setErrorWithStatus("Could not encode image data.");
        return false;
    }

    std::cout << "constructing tensor from image data" << std::endl;

    // the image tensor will be 1-dimensional
    std::vector<const int64_t> dims = {1};
    imageTensor = TF_NewTensor(TF_STRING, dims.data(), dims.size(), encodedImage, totalSize, &Deallocator, 0);

    std::cout << "tensor has " << TF_NumDims(imageTensor) << " dims, and length " << TF_Dim(imageTensor, 0) << " in the 0th dim" << std::endl;

    if (imageTensor == nullptr) {
        return setError("Could not init image input tensor.");
    }

    return true;
}

bool Detection::initOperations() {
    TF_Output input = {TF_GraphOperationByName(graph, "encoded_image_string_tensor"), 0};
    if (input.oper == nullptr) {
        return setError("Could not init input oper.");
    }
    std::cout << "expected dims of encoded_image_string_tensor: " << TF_GraphGetTensorNumDims(graph, input, status) << std::endl;

    sessionArgs.inputs.push_back(input);

    if (!setImageTensor()) return false;

    sessionArgs.inputValues.push_back(imageTensor);

    std::vector<std::string> outputNames = {
        "detection_boxes", 
        "detection_scores", 
        "detection_classes", 
        "num_detections"
    };

    for (std::string name : outputNames) {
        TF_Output output = {TF_GraphOperationByName(graph, name.c_str()), 0};
        if (output.oper == nullptr) {
            const std::string message = "Could not init output graph name " + name;
            return setError(message);
        }
        sessionArgs.outputs.push_back(output);
    }
    sessionArgs.outputValues = std::vector<TF_Tensor*>(4);

    return true;
}

bool Detection::runSession () {
    std::cout << "running session" << std::endl;

    TF_SessionRun(
        session, 
        nullptr, 
        sessionArgs.inputs.data(), 
        sessionArgs.inputValues.data(), 
        sessionArgs.inputValues.size(), 
        sessionArgs.outputs.data(), 
        sessionArgs.outputValues.data(), 
        sessionArgs.outputValues.size(), 
        nullptr, 
        0, 
        nullptr, 
        status);

    if (TF_GetCode(status) != TF_OK) {
        std::cout << "error running session: " << TF_GetCode(status) << " " << TF_Message(status) << std::endl;
        return setErrorWithStatus("Could not run TF session.");
    }

    TF_CloseSession(session, status);

    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not close TF session cleanly.");
    }

    TF_DeleteSession(session, status);
    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not delete TF session cleanly.");
    }

    float* scoresData = static_cast<float*>(TF_TensorData(sessionArgs.outputValues[1]));
    float* boxesData = static_cast<float*>(TF_TensorData(sessionArgs.outputValues[0]));

    data.numDetections = TF_Dim(sessionArgs.outputValues[0], 1);
    data.boxes.assign(boxesData, boxesData + data.numDetections);
    data.scores.assign(scoresData, scoresData + data.numDetections);

    response.status = 0; // we've gotten all the data out, so status is successful
    response.message = "OK";
    return true;
}

DetectResponse Detection::getDetectResponse (Napi::Env env) {
    // if we had a failure, no need to do anything, just return response
    if (response.status == -1) {
        return response;
    }

    // otherwise build node values from response
    response.detected = buildNodeValues(env);
    return response;
}

Napi::Array Detection::buildNodeValues (Napi::Env env) {
    std::vector<std::vector<float>> boxMatrix;
    for (int i = 0; i < data.numDetections; i++) {
        int idx = floor(i / 4);
        boxMatrix[idx][i % 4] = data.boxes[i];
    }

    Napi::Array detected = Napi::Array::New(env);
    int goodDetections = 0;
    for (int i = 0; i < data.numDetections; i++) {
        if (data.scores[i] >= detectThreshold) {
            std::cout << "Found entity with score of: " << data.scores[i] << ". Its % bounds are: [" << boxMatrix[i][1] << ", " << boxMatrix[i][0] << "] -> [" << boxMatrix[i][3] << ", " << boxMatrix[i][2] << "]" << std::endl;
            Napi::Object detection = Napi::Object::New(env);
            detection.Set("confidence", data.scores[i]);
            detection.Set("ymin", boxMatrix[i][0]);
            detection.Set("xmin", boxMatrix[i][1]);
            detection.Set("ymax", boxMatrix[i][2]);
            detection.Set("xmax", boxMatrix[i][3]);

            detected.Set(goodDetections, detection);
            goodDetections++;
        }
    }

    return detected;
}

void Detection::cleanup () {
    for (TF_Tensor* tensor : sessionArgs.outputValues) {
        TF_DeleteTensor(tensor);
    }
    TF_DeleteGraph(graph);
    TF_DeleteStatus(status);
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

    Detection detection = Detection(modelPath.Utf8Value(), imgPath.Utf8Value(), detectThreshold.FloatValue());
    detection.detect();
    DetectResponse res = detection.getDetectResponse(env);

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