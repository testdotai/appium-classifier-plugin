{
  "targets": [{
    "target_name": "test-ai-classifier",
    "cflags!": [ "-fno-exceptions" ],
    "cflags_cc!": [ "-fno-exceptions" ],
    "sources": [
      "cc/main.cc",
      "cc/detection.cc"
    ],
    'include_dirs': [
      "<!@(node -p \"require('node-addon-api').include\")",
      "./node_modules/@tensorflow/tfjs-node/deps/include"
    ],
    'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
  }]
}
