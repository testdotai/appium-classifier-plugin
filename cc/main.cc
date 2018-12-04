#include <napi.h>
#include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "TF_VERSION"),
                Napi::String::New(env, TF_Version()));
    return exports;
}

NODE_API_MODULE(testaddon, Init)