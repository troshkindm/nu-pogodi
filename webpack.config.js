const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const config = (_env, argv) => {
  const production = argv.mode === 'production';
  return {
  entry: './src/index.ts',
  devtool: production ? false : 'eval-source-map',
  mode: production ? 'production' : 'development',
  output: {
    filename: production ? 'bundle.[contenthash:8].js' : 'bundle.js',
    clean: true,
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/'
  },
  devServer: {
    port: 8080,
    static: {
      directory: path.join(__dirname, 'public'),
    },
  },
  module: {
    rules: [
      { resourceQuery: /raw/, type: 'asset/source' },
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.json'),
            },
          },
        ],
        exclude: [/node_modules/],
      },
      { test: /\.mjs$/, include: /node_modules/, type: 'javascript/auto' },
      {
        test: /\.(css|less)$/,
        exclude: /module\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              esModule: false,
            },
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      {
        test: /\.less$/,
        include: /module\.less$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              esModule: false,
              modules: {
                localIdentName: '[local]_[hash:base64:5]',
              },
            },
          },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
              },
            },
          },
        ],
      },
      { test: /\.(woff2?|ttf)$/, type: 'asset/resource' },
      {
        test: /\.(png|jpg|gif)$/,
        use: [
          {
            loader: 'url-loader',
          },
        ],
        include: [path.resolve('./src')],
        type: 'javascript/auto',
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      tls: false,
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '*'],
    unsafeCache: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      filename: 'index.html',
    }),
    new CopyPlugin({
      patterns: [{ from: 'public', globOptions: { ignore: ['**/index.html'] } }],
    }),
  ],
};
};

module.exports = config;
