#ifndef TF_DETECTION
#define TF_DETECTION

#include <iostream>
#include <napi.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

// Container for a detection result, which could be a failure with an error message
struct DetectResponse {
    // result status: 0 for success, -1 for failure
    int status;

    // error message
    std::string message;

    // array of detected object data
    Napi::Array detected;
};

// Container for the arguments to the TF run session command
struct SessionArgs {
    // TF operations representing the inputs
    std::vector<TF_Output> inputOps;

    // Actual input tensors
    std::vector<TF_Tensor*> inputVals;

    // TF operations representing the outputs
    std::vector<TF_Output> outputOps;

    // Empty array of output tensors (will be filled with output data by TF)
    std::vector<TF_Tensor*> outputVals;
};

// Container for the result of a TF run
struct DetectionData {
    // the number of objects detected in the image
    int numDetections;
    
    // flat array of coordinate data of detected objects
    // coordinates are in ratio of image height/width
    std::vector<float> boxes;

    // array of score (confidence) data (0-1)
    std::vector<float> scores;
};

// Container for the image's data and size
struct ImageBuffer {
    char* buffer;
    int bufferLen;
};

// Function that will be called by TF when it wants to delete a tensor's data
void Deallocator(void* data, size_t size, void* arg);

// (currently-unused) helper function to print the dimensions of a tensor
void printTensorDims(std::vector<TF_Tensor*> tensors);

// Get a data buffer from reading a file. Used to get the raw binary data from the image
ImageBuffer readFile(std::string file);

// Class representing an attempt to detect objects in an image using TF
class Detection {
    public:
        // Constructor for the Detection class
        Detection (std::string modelPath, std::string imgPath, float detectThreshold, bool debug);

        // Run through the detection process and short-circuit if any step fails
        void detect ();

        // Get the result of the detection
        DetectResponse getDetectResponse (Napi::Env env);

    private:
        TF_Graph* graph;         // TF graph populated by loading the saved model
        TF_Status* status;       // TF status object reused in most TF commands
        TF_Session* session;     // TF session used to run the detection
        float detectThreshold;   // Confidence (0-1) below which results will be ignored
        std::string modelPath;   // Path to the saved TF model
        std::string imgPath;     // Path to the image in which to detect objects
        DetectionData data;      // Data output from the TF session
        DetectResponse response; // Container for response to the main process
        char* encodedImage;      // Image data encoded in TF format for use as input in the graph
        TF_Tensor* imageTensor;  // Tensor version of the input image
        SessionArgs sessionArgs; // Container for arguments to the run session command
        bool debug;              // Whether or not to show debug output

        // Helper function to set the class-internal response message
        bool setError(std::string msg);

        // Helper function to extract error message from TF status and clean up
        bool setErrorWithStatus (std::string msg);

        // Set up the TF graph and session
        bool initSession ();

        // Initialize the inputs and outputs that will be used with the TF session
        bool initOperations();

        // Get binary data from an image path and turn it into a TF tensor
        bool setImageTensor ();

        // Run the TF session and collect the output data
        bool runSession();

        // Ensure we clean up objects and free necessary memory
        void cleanup();

        // Turn the TF output into Napi values suitable for sending back to Node
        Napi::Array buildNodeValues(Napi::Env env);
};

#endif