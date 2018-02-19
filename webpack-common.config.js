var path = require('path');

module.exports = {
    glslLoader: {
        // please consider modifying corresponding loaders in webpack-babel.config.js too
        test: /\.glsl$/,
        include: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'test'),
        ],
        loader: 'raw-loader',
    },
    jsonLoader: {
        // please consider modifying corresponding loaders in webpack-babel.config.js too
        test: /\.json$/,
        include: [
            path.resolve(__dirname, 'utils'),
        ],
        loader: 'raw-loader',
    },
    cssLoader: {
        // please consider modifying corresponding loaders in webpack-babel.config.js too
        test: /\.css$/,
        include: [
            path.resolve(__dirname, 'src'),
        ],
        loader: 'raw-loader',
    },
    htmlLoader: {
        // please consider modifying corresponding loaders in webpack-babel.config.js too
        test: /\.html$/,
        include: [
            path.resolve(__dirname, 'src'),
        ],
        loader: 'raw-loader',
    },
};
