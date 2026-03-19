{
  "targets": [{
    "target_name": "speaker",
    "sources": ["native/speaker.c"],
    "include_dirs": ["native"],
    "cflags": ["-std=c99", "-O2"],
    "xcode_settings": {
      "OTHER_CFLAGS": ["-std=c99", "-O2"],
      "MACOSX_DEPLOYMENT_TARGET": "10.13"
    },
    "msvs_settings": {
      "VCCLCompilerTool": {
        "AdditionalOptions": ["/O2"]
      }
    },
    "conditions": [
      ["OS=='mac'", {
        "libraries": [
          "-framework CoreAudio",
          "-framework AudioToolbox",
          "-framework CoreFoundation"
        ]
      }],
      ["OS=='linux'", {
        "libraries": [
          "-lpthread",
          "-lm",
          "-ldl"
        ]
      }],
      ["OS=='win'", {
        "libraries": [
          "ole32.lib"
        ]
      }]
    ]
  }]
}
