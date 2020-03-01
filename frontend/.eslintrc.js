module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    // https://github.com/vuejs/eslint-plugin-vue#priority-a-essential-error-prevention
    // consider switching to `plugin:vue/strongly-recommended` or `plugin:vue/recommended` for stricter rules.
    'plugin:vue/essential',
    '@vue/airbnb',
  ],
  plugins: [
    'vue', // required to lint *.vue files
  ],
  rules: {
    // allow single-line objects, eg: { a: null, b: null }
    'object-curly-newline': 0,
    // don't require .vue extension when importing
    'import/extensions': ['error', 'always', {
      js: 'never',
      vue: 'never'
    }],
    // allow optionalDependencies
    'import/no-extraneous-dependencies': ['error', {
      optionalDependencies: ['test/unit/index.js']
    }],
    // allow debugger during development
    'no-return-assign': 0,
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': process.env.NODE_ENV === 'production'
      ? ['error', { "args": "none" }]
      : 'off'
    ,
    'no-plusplus': 0, // i++ OK :D
    'no-else-return': ["error", { allowElseIf: true }],
    'arrow-parens': ["error", "always"], // Forces `(thing) -> thing.x`
    'no-param-reassign': ['error', {
      props: true,
      ignorePropertyModificationsFor: [
        'state', // for vuex store
        'payload',
      ],
    }],
    // TODO: write custom rule to allow as object props
    'global-require': 0, // allows importing components into an object
    // TODO: figure out how to enforce this just within vue watchers?
    'func-names': 0,
    // sometimes it makes sense if you think the file will soon be expanded
    'import/prefer-default-export': 0,
    'radix': 0,
    'no-confusing-arrow': 0,
    'max-len': 0,
    'import/no-webpack-loader-syntax': 0,
    'no-param-reassign': 0,
    'no-underscore-dangle': 0,
    'consistent-return': 'off',
    'no-useless-return': 'off',


  },
  parserOptions: {
    parser: 'babel-eslint',
  },

};
