{
    'targets': [
        {
            'target_name': 'binding',
            'win_delay_load_hook': 'true',
            'sources': [
                'src/binding.cpp',
                'src/util/getopt.c'
            ],
            'include_dirs': [
                'src/util',
                'src/mpg123/src',
                'src/mpg123/src/libmpg123',
                'src/mpg123/src/libout123',
                '<!(node -e "require(\'nan\')")'
            ],
            'dependencies': [
                'src/mpg123.gyp:module'
            ]
        }
    ]
}