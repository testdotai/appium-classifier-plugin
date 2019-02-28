#include <iostream>
#include <napi.h>
#include "detection.h"

Napi::Value Detect(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (info.Length() < 3) {
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

    bool debug = false;

    if (info.Length() == 4 && info[3].IsBoolean()) {
        debug = info[3].As<Napi::Boolean>();
    }

    Detection detection = Detection(modelPath.Utf8Value(), imgPath.Utf8Value(), detectThreshold.FloatValue(), debug);
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