#ifndef TF_DETECTION
#define TF_DETECTION

#include <iostream>
#include <napi.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

struct DetectResponse {
    int status;
    std::string message;
    Napi::Array detected;
};

struct SessionArgs {
    std::vector<TF_Output> inputOps;
    std::vector<TF_Tensor*> inputVals;
    std::vector<TF_Output> outputOps;
    std::vector<TF_Tensor*> outputVals;
};

struct DetectionData {
    int numDetections;
    std::vector<float> boxes;
    std::vector<float> scores;
};

struct ImageBuffer {
    char* buffer;
    int bufferLen;
};

void Deallocator(void* data, size_t size, void* arg);
void printTensorDims(std::vector<TF_Tensor*> tensors);
ImageBuffer readFile(std::string file);

class Detection {
    public:
        Detection (std::string modelPath, std::string imgPath, float detectThreshold, bool debug);
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
        TF_Tensor* imageTensor;
        SessionArgs sessionArgs;
        bool debug;

        bool initSession ();
        bool setError(std::string msg);
        bool setErrorWithStatus (std::string msg);
        bool setImageTensor ();
        bool initOperations();
        bool runSession();
        void cleanup();
        Napi::Array buildNodeValues(Napi::Env env);
};

#endif