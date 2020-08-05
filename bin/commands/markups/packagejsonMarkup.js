var packagejsonMarkup = (opt) => {
return `{
    "name": "${opt.name}",
    "version": "1.0.0",
    "description": "${opt.head.description}",
    "main": "index.js",
    "config": {
        "port": "${opt.config.port}"
    },
    "scripts": {        
        "update-s3": "aws s3 sync dist/ s3://$npm_package_config_s3 --profile $npm_package_config_iam",
        "update-cdn": "aws cloudfront update-distribution --id $npm_package_config_cf_id --default-root-object index.html --profile $npm_package_config_iam",
        "force_cdn_invalidation": "aws cloudfront create-invalidation --distribution-id $npm_package_config_cf_id --paths '/*' --profile $npm_package_config_iam",
        
        "build-cmps": "./node_modules/.bin/rollup -c",
        "build": "gulp buildAll",
        "dev": "watch 'npm run build && node run.js $npm_package_config_port' src",
        "deploy": "npm run update-s3 && npm run update-cdn && npm run force_cdn_invalidation"
    },
    "author": "footloose.io",
    "license": "ISC",
    "devDependencies": {
        "@babel/cli": "^7.1.2",
        "@babel/core": "^7.1.2",
        "babel-cli": "^6.26.0",
        "babel-plugin-transform-class-properties": "^6.24.1",
        "del": "^5.1.0",
        "finalhandler": "^1.1.2",
        "gulp": "^4.0.2",
        "gulp-concat": "^2.6.1",
        "gulp-concat-css": "^3.1.0",
        "gulp-htmlmin": "^5.0.1",
        "gulp-inline-source": "^4.0.0",
        "gulp-rename": "^1.4.0",
        "gulp-run-command": "0.0.10",
        "gulp-uglify": "^3.0.2",
        "gulp-uglifycss": "^1.1.0",
        "kill-port": "^1.6.0",
        "rollup": "^0.66.6",
        "rollup-plugin-babel": "^4.4.0",
        "rollup-plugin-commonjs": "^9.2.0",
        "rollup-plugin-node-resolve": "^3.4.0",
        "rollup-plugin-replace": "^2.1.0",
        "rollup-plugin-uglify": "^6.0.0",
        "serve-static": "^1.14.1",
        "uglify-es": "^3.3.9",
        "watch": "^1.0.2"
    },
    "dependencies": {
        "muffin": "github:FootLooseLabs/element"
    }
}
`
}

module.exports = {
    packagejsonMarkup
}