/* eslint-disable */

const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

module.exports = {
    mode: 'development',
    target: 'web',
    entry: './src/index.tsx',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        assetModuleFilename: 'images/[name][ext]'
    },
    devServer: {
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname, 'public'), // Serve files from the public folder
        },
        port: 3000,
        hot: true,
        setupMiddlewares: (middlewares, devServer) => {
            if (!devServer) {
                return middlewares;
            }

            devServer.app.get('/login', (req, res) => {
                console.log(req.originalUrl);
                const targetDomain = 'http://localhost:4000';
                const newUrl = `${targetDomain}${req.originalUrl}`;
                res.redirect(302, newUrl);
            });

            return middlewares;
        },
        proxy: [{
            context: ['/logout'],
            target: 'http://localhost:4000', // Your backend auth server
            changeOrigin: true, // Needed for virtual hosted sites
        }, {
            context: ['/api/ul'],
            target: 'http://localhost:4000', // Your backend auth server
            changeOrigin: true, // Needed for virtual hosted sites
            pathRewrite: { '^/api': '' },
        }, {
            context: ['/api'],
            target: 'http://localhost:4100', // Your backend game server
            changeOrigin: true, // Needed for virtual hosted sites
        }]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyPlugin({
            patterns: [
                { from: 'public', to: '' }
            ]
        })
    ],
    module: {
        rules: [{
            test: /\.(tsx|ts|jsx|js)$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        '@babel/preset-env',
                        ['@babel/preset-react', { 'runtime': 'automatic' }],
                        '@babel/preset-typescript'
                    ]
                }
            }
        }, {
            test: /\.css$/,
            exclude: /\.module\.css$/,
            use: ['style-loader', 'css-loader']
        }, {
            test: /\.(png|svg|jpg|jpeg\gif)$/,
            type: 'asset/resource'
        },      {
            test: /\.(woff|woff2|ttf|otf|eot)$/,
            type: 'asset/resource',
            generator: {
              filename: 'fonts/[name][ext]', // Output fonts to 'dist/fonts/'
            },
          },]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js']
    }
}