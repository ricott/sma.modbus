'use strict';

const js = require('@eslint/js');
const globals = require('globals');

// ESLint 10 flat config (CommonJS - this project is CommonJS, no "type":"module").
// Scoped to the Node source we maintain; browser-context and generated code is
// ignored. Rules start from the recommended baseline plus a conservative set of
// quality/modernization checks. eqeqeq is a warning (not error) because several
// intentional comparisons pit a settings string against a number.
module.exports = [
    {
        ignores: [
            '.homeybuild/**',
            'build/**',
            'node_modules/**',
            'test/*.js',   // manual hardware probe scripts (hardcoded IPs, process.exit)
            'settings/**', // browser context, Homey-injected globals
            'widgets/**'   // browser context
        ]
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-var': 'error',
            'prefer-const': 'error',
            'eqeqeq': ['warn', 'smart'],
            'no-unused-vars': ['warn', {
                args: 'none',
                caughtErrors: 'none',
                varsIgnorePattern: '^_'
            }]
        }
    }
];
