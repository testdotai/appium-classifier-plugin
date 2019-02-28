#include "detection.h"
#include <fstream>
#include <math.h>

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
ImageBuffer readFile(std::string file) {
    std::ifstream filedata(file, std::ifstream::binary);

    if (!filedata) {
        return {nullptr, -1};
    }

    filedata.seekg(0, filedata.end);
    int len = filedata.tellg();
    filedata.seekg(0, filedata.beg);

    char* buf = new char[len];
    filedata.read(buf, len);
    return {buf, len};
}

Detection::Detection (std::string modelPath, std::string imgPath, float detectThreshold, bool debug) {
    this->modelPath = modelPath;
    this->imgPath = imgPath;
    this->detectThreshold = detectThreshold;
    this->debug = debug;
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
    ImageBuffer image = readFile(imgPath);
    if (image.bufferLen == -1) {
        return setError("Could not read image data at path provided.");
    }
    
    if (debug) std::cout << "image data is: " << image.bufferLen << " bytes long" << std::endl;

    // TF requires that the image data start 8 bytes into the char array
    int tensorByteOffset = 8;

    // get the size that TF thinks our image data will take up
    size_t encodedSize = TF_StringEncodedSize(image.bufferLen);

    // the total size will be that plus the magic byte offset length
    size_t totalSize = encodedSize + tensorByteOffset;

    // zero out the first magic bytes
    encodedImage = (char*)malloc(totalSize);
    for (int i = 0; i < tensorByteOffset; i++) {
        encodedImage[i] = 0;
    }

    // direct TF to encode our image data into the encodedImage var
    TF_StringEncode(image.buffer, image.bufferLen, encodedImage + tensorByteOffset, encodedSize, status);

    if (TF_GetCode(status) != TF_OK) {
        setErrorWithStatus("Could not encode image data.");
        return false;
    }

    if (debug) std::cout << "constructing tensor from image data" << std::endl;

    // the image tensor will be 1-dimensional
    const int64_t dims[] = {1};
    imageTensor = TF_NewTensor(TF_STRING, dims, 1, encodedImage, totalSize, &Deallocator, 0);

    if (debug) std::cout << "tensor has " << TF_NumDims(imageTensor) << " dims, and length " 
                         << TF_Dim(imageTensor, 0) << " in the 0th dim" << std::endl;

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
    
    if (debug) std::cout << "expected dims of encoded_image_string_tensor: " 
                         << TF_GraphGetTensorNumDims(graph, input, status) << std::endl;

    sessionArgs.inputOps.push_back(input);

    if (!setImageTensor()) {
        return false;
    }

    sessionArgs.inputVals.push_back(imageTensor);

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
        sessionArgs.outputOps.push_back(output);
    }
    sessionArgs.outputVals = std::vector<TF_Tensor*>(4);
    
    if (debug) std::cout << "running session with input values size " << sessionArgs.inputVals.size() 
                         << " and output values size " << sessionArgs.outputVals.size() 
                         << " and inputs size " << sessionArgs.inputOps.size() 
                         << " and outputs size " << sessionArgs.outputOps.size() << std::endl;

    TF_SessionRun(
        session, 
        nullptr, 
        sessionArgs.inputOps.data(), 
        sessionArgs.inputVals.data(), 
        sessionArgs.inputVals.size(), 
        sessionArgs.outputOps.data(), 
        sessionArgs.outputVals.data(), 
        sessionArgs.outputVals.size(), 
        nullptr, 
        0, 
        nullptr, 
        status);

    if (TF_GetCode(status) != TF_OK) {
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

    float* boxesData = static_cast<float*>(TF_TensorData(sessionArgs.outputVals[0]));
    float* scoresData = static_cast<float*>(TF_TensorData(sessionArgs.outputVals[1]));

    data.numDetections = TF_Dim(sessionArgs.outputVals[0], 1);
    data.boxes.assign(boxesData, boxesData + data.numDetections);
    data.scores.assign(scoresData, scoresData + data.numDetections);

    response.status = 0; // we've gotten all the data out, so status is successful
    response.message = "OK";
    return true;
}

bool Detection::runSession () {
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

    std::vector<std::vector<float>> boxMatrix(data.numDetections, std::vector<float>(4));
    for (int i = 0; i < data.numDetections; i++) {
        int idx = floor(i / 4);
        boxMatrix[idx][i % 4] = data.boxes[i];
    }

    Napi::Array detected = Napi::Array::New(env);
    int goodDetections = 0;
    for (int i = 0; i < data.numDetections; i++) {
        if (data.scores[i] >= detectThreshold) {
            if (debug) std::cout << "Found entity with score of: " << data.scores[i] << ". Its % bounds are: [" 
                                 << boxMatrix[i][1] << ", " << boxMatrix[i][0] << "] -> [" << boxMatrix[i][3] 
                                 << ", " << boxMatrix[i][2] << "]" << std::endl;
            Napi::Object detection = Napi::Object::New(env);
            detection.Set("confidence", data.scores[i]);
            detection.Set("xmin", boxMatrix[i][1]);
            detection.Set("ymin", boxMatrix[i][0]);
            detection.Set("xmax", boxMatrix[i][3]);
            detection.Set("ymax", boxMatrix[i][2]);

            detected.Set(goodDetections, detection);
            goodDetections++;
        }
    }

    return detected;
}

void Detection::cleanup () {
    for (TF_Tensor* tensor : sessionArgs.outputVals) {
        TF_DeleteTensor(tensor);
    }
    TF_DeleteGraph(graph);
    TF_DeleteStatus(status);
    free(encodedImage);
}