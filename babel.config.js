module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Must stay last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
