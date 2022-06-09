const path = require("path");
module.exports = {
    mode: "development",
    entry: "./src/index.js",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "index.js"
    },
    module: {
        rules: [
            {
                test: /\.scss$/,
                use: [{ 
                    loader: "style-loader" 
                }, { 
                    loader: "css-loader" 
                }, {
                    loader: 'postcss-loader', options: {
                        postcssOptions: {
                            plugins: () => {
                                [
                                    require('autoprefixer')
                                ];
                            }
                        }
                    }
                },{
                    loader: 'sass-loader'
                }],
            },
        ]
    },
    devServer: {
        static: "./dist"
    }
};
