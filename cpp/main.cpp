#include <napi.h>
// #include "../node_modules/@tensorflow/tfjs-node/deps/include/tensorflow/c/c_api.h"

Napi::String GetTFVersion(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    return Napi::String::New(env, "hello");
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "tfVersion"), GetTFVersion);
    return exports;
}

NODE_API_MODULE(testaddon, InitAll)