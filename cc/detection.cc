#include "detection.h"
#include <fstream>
#include <math.h>

using namespace std;

void Deallocator (void* data, size_t size, void* arg) {
  TF_DeleteTensor((TF_Tensor *)data);
  *(int*)arg = 1;
}

void printTensorDims (vector<TF_Tensor*> tensors) {
    for (TF_Tensor* tensor : tensors) {
        int dims = TF_NumDims(tensor);
        string shape = "[";
        for (int j = 0; j < dims; j++) {
            shape = shape.append(to_string(TF_Dim(tensor, j))).append(", ");
        }
        shape = shape.append("]");
        cout << "Shape for tensor: " << shape << endl;
    }
}

ImageBuffer readFile (string file) {
    ifstream filedata(file, ifstream::binary);

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

Detection::Detection (string modelPath, string imgPath, float detectThreshold, bool debug) {
    this->modelPath = modelPath;
    this->imgPath = imgPath;
    this->detectThreshold = detectThreshold;
    this->debug = debug;  // whether or not to print debug output
    response.status = -1; // set the detection status to failed by default
}

void Detection::detect () {
    // If any subroutine fails, short-circuit and return, and wait for the caller to call 
    // getDetectResponse
    if (!initSession()) return;
    if (!initOperations()) return;
    if (!runSession()) return;
    cleanup();
}

bool Detection::initSession () {
    graph = TF_NewGraph();
    status = TF_NewStatus();

    // "serve" is the magic tag to get the model in the mode we want
    vector<const char*> tags = {"serve"};
    TF_SessionOptions* options = TF_NewSessionOptions();

    // get the session out of the model path
    session = TF_LoadSessionFromSavedModel(options, nullptr, modelPath.c_str(), tags.data(), 1, graph, nullptr, status);
    TF_DeleteSessionOptions(options);

    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not load saved model.");
    }

    return true;
}

bool Detection::setErrorWithStatus(string msg) {
    response.message = msg + " Message was: " + TF_Message(status);
    TF_DeleteStatus(status);
    return false;
}

bool Detection::setError(string msg) {
    response.message = msg;
    return false;
}

bool Detection::setImageTensor() {
    ImageBuffer image = readFile(imgPath);
    if (image.bufferLen == -1) {
        return setError("Could not read image data at path provided.");
    }
    
    if (debug) cout << "image data is: " << image.bufferLen << " bytes long" << endl;

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

    // direct TF to encode our image data into the encodedImage var, 8 bytes in
    TF_StringEncode(image.buffer, image.bufferLen, encodedImage + tensorByteOffset, encodedSize, status);

    if (TF_GetCode(status) != TF_OK) {
        setErrorWithStatus("Could not encode image data.");
        return false;
    }

    if (debug) cout << "constructing tensor from image data" << endl;

    // the image tensor will be 1-dimensional
    const int64_t dims[] = {1};
    imageTensor = TF_NewTensor(TF_STRING, dims, 1, encodedImage, totalSize, &Deallocator, 0);

    if (debug) cout << "tensor has " << TF_NumDims(imageTensor) << " dims, and length " 
                    << TF_Dim(imageTensor, 0) << " in the 0th dim" << endl;

    if (imageTensor == nullptr) {
        return setError("Could not init image input tensor.");
    }

    return true;
}

bool Detection::initOperations() {
    // TF_Output is a struct with a graph operation and an index. Our indexes are all 0
    TF_Output input = {TF_GraphOperationByName(graph, "encoded_image_string_tensor"), 0};
    if (input.oper == nullptr) {
        return setError("Could not init input operation.");
    }
    
    if (debug) cout << "expected dims of encoded_image_string_tensor: " 
                    << TF_GraphGetTensorNumDims(graph, input, status) << endl;

    sessionArgs.inputOps.push_back(input);

    if (!setImageTensor()) {
        return false;
    }

    sessionArgs.inputVals.push_back(imageTensor);

    vector<string> outputNames = {
        "detection_boxes", 
        "detection_scores", 
        "detection_classes", 
        "num_detections"
    };

    for (string name : outputNames) {
        TF_Output output = {TF_GraphOperationByName(graph, name.c_str()), 0};
        if (output.oper == nullptr) {
            const string message = "Could not init output graph " + name;
            return setError(message);
        }
        sessionArgs.outputOps.push_back(output);
    }
    sessionArgs.outputVals = vector<TF_Tensor*>(4);
    
    if (debug) cout << "will run session with input values size " << sessionArgs.inputVals.size() 
                    << " and output values size " << sessionArgs.outputVals.size() 
                    << " and inputs size " << sessionArgs.inputOps.size() 
                    << " and outputs size " << sessionArgs.outputOps.size() << endl;

    return true;
}

bool Detection::runSession () {
    // finally, actually run the session
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

    // close the session afterward
    TF_CloseSession(session, status);
    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not close TF session cleanly.");
    }

    // and delete it too
    TF_DeleteSession(session, status);
    if (TF_GetCode(status) != TF_OK) {
        return setErrorWithStatus("Could not delete TF session cleanly.");
    }

    // get the bounds and scores data as flat float arrays from the output tensors
    float* boxesData = static_cast<float*>(TF_TensorData(sessionArgs.outputVals[0]));
    float* scoresData = static_cast<float*>(TF_TensorData(sessionArgs.outputVals[1]));

    // the number of detections we found will be the length of the 1st dimension of an output tensor
    data.numDetections = TF_Dim(sessionArgs.outputVals[0], 1);

    // use the vector methods to put the raw data into c++ vectors more easy to work with
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
    // data.boxes comes in as a flat array, but every set of 4 values actually corresponds
    // to a single detected object. what we want is a 2-dim vector instead.
    vector<vector<float>> boxMatrix(data.numDetections, vector<float>(4));
    for (int i = 0; i < data.numDetections; i++) {
        int idx = floor(i / 4);
        boxMatrix[idx][i % 4] = data.boxes[i];
    }

    Napi::Array detected = Napi::Array::New(env);
    int goodDetections = 0; // the number of detections which passed the confidence threshold
    for (int i = 0; i < data.numDetections; i++) {
        if (data.scores[i] >= detectThreshold) {
            if (debug) cout << "Found entity with score of: " << data.scores[i] << ". Its % bounds are: [" 
                            << boxMatrix[i][1] << ", " << boxMatrix[i][0] << "] -> [" << boxMatrix[i][3] 
                            << ", " << boxMatrix[i][2] << "]" << endl;

            // construct a node object with the response data, including bounds and confidence
            Napi::Object detection = Napi::Object::New(env);
            detection.Set("confidence", data.scores[i]);
            detection.Set("xmin", boxMatrix[i][1]);
            detection.Set("ymin", boxMatrix[i][0]);
            detection.Set("xmax", boxMatrix[i][3]);
            detection.Set("ymax", boxMatrix[i][2]);

            // add the object to the array at the index corresponding to goodDetections
            // and increment, so we add items to the array without any gaps
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
    free(encodedImage); // since we 'malloc'ed this earlier
}