{
    'variables': {
        'target_arch%': 'ia32',
        'conditions': [
            ['OS=="mac"', {
                'mpg123_module%': 'coreaudio'
            }],
            ['OS=="win"', {
                'mpg123_module%': 'win32'
            }],
            ['OS=="linux"', {
                'mpg123_module%': 'alsa'
            }]
        ]
    },
    'target_defaults': {
        'configurations': {
            'Debug': {
                'defines': [
                    'DEBUG'
                ],
                'msvs_settings': {
                    'VCCLCompilerTool': {
                        'RuntimeLibrary': 1
                    }
                }
            },
            'Release': {
                'defines': [
                    'NDEBUG'
                ],
                'msvs_settings': {
                    'VCCLCompilerTool': {
                        'RuntimeLibrary': 0
                    }
                }
            }
        },
        'msvs_settings': {
            'VCLinkerTool': {
                'GenerateDebugInformation': 'true'
            }
        },
        'conditions': [
            ['OS=="mac"', {
                'conditions': [
                    ['target_arch=="ia32"', { 'xcode_settings': { 'ARCHS': [ 'i386' ] } }],
                    ['target_arch=="x64"', { 'xcode_settings': { 'ARCHS': [ 'x86_64' ] } }]
                ]
            }]
        ]
    },
    'targets': [
        {
            'target_name': 'out123',
            'type': 'static_library',
            'dependencies': [ 'compat' ],
            'include_dirs': [
                'mpg123/src/libout123',
                'config/<(OS)/<(target_arch)'
            ],
            'defines': [
                'PIC',
                'NOXFERMEM',
                'HAVE_CONFIG_H'
            ],
            'direct_dependent_settings': {
                'include_dirs': [
                    'mpg123/src/libout123',
                    'config/<(OS)/<(target_arch)'
                ]
            },
            'sources': [
                'mpg123/src/libout123/legacy_module.c',
                'mpg123/src/libout123/libout123.c',
                'mpg123/src/libout123/sfifo.c',
                'mpg123/src/libout123/stringlists.c',
                'mpg123/src/libout123/wav.c'
            ]
        },
        {
            'target_name': 'compat',
            'type': 'static_library',
            'defines': [
                'PIC',
                'NOXFERMEM',
                'HAVE_CONFIG_H'
            ],
            'sources': [
                'mpg123/src/compat/compat.c',
                'mpg123/src/compat/compat_str.c'
            ],
            'conditions': [
                ['mpg123_module=="coreaudio"', {
                    'direct_dependent_settings': {
                        'include_dirs': [
                            'mpg123/src',
                            'mpg123/src/compat',
                            'mpg123/src/libmpg123',
                            'config/<(OS)/<(target_arch)'
                        ]
                    },
                    'include_dirs': [
                        'mpg123/src',
                        'mpg123/src/compat',
                        'mpg123/src/libmpg123',
                        'config/<(OS)/<(target_arch)'
                    ],
                }],
                ['mpg123_module=="win32"', {
                    'direct_dependent_settings': {
                        'include_dirs': [
                            'util',
                            'mpg123/src',
                            'mpg123/src/compat',
                            'mpg123/src/libmpg123',
                            'config/<(OS)/<(target_arch)'
                        ]
                    },
                    'include_dirs': [
                        'util',
                        'mpg123/src',
                        'mpg123/src/compat',
                        'mpg123/src/libmpg123',
                        'config/<(OS)/<(target_arch)'
                    ],
                }],
                ['mpg123_module=="alsa"', {
                    'direct_dependent_settings': {
                        'include_dirs': [
                            'mpg123/src',
                            'mpg123/src/compat',
                            'mpg123/src/libmpg123',
                            'config/<(OS)/<(target_arch)'
                        ]
                    },
                    'include_dirs': [
                        'mpg123/src',
                        'mpg123/src/compat',
                        'mpg123/src/libmpg123',
                        'config/<(OS)/<(target_arch)'
                    ],
                }]
            ],
        },
        {
            'target_name': 'module',
            'type': 'static_library',
            'dependencies': ['compat', 'out123' ],
            'include_dirs': [
                'mpg123/src/libout123/modules',
                'config/<(OS)/<(target_arch)'
            ],
            'defines': [
                'PIC',
                'NOXFERMEM',
                'REAL_IS_FLOAT',
                'HAVE_CONFIG_H',
                'BUILDING_OUTPUT_MODULES=1'
            ],
            'direct_dependent_settings': {
                'include_dirs': [
                    'mpg123/src/libout123/modules',
                    'config/<(OS)/<(target_arch)'
                ]
            },
            'conditions': [
                ['mpg123_module=="coreaudio"', {
                    'link_settings': {
                        'libraries': [
                            '-framework AudioToolbox',
                            '-framework AudioUnit',
                            '-framework CoreServices'
                        ]
                    }
                }],
                ['mpg123_module=="win32"', {
                    'link_settings': {
                        'libraries': [
                            '-lwinmm.lib'
                        ]
                    }
                }],
                ['mpg123_module=="alsa"', {
                    'link_settings': {
                        'libraries': [
                            '-lasound'
                        ]
                    }
                }]
            ],
            'sources': [ 'mpg123/src/libout123/modules/<(mpg123_module).c' ]
        }
    ]
}
