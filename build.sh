#!/bin/bash

echo "installing babel-cli"
npm install --save-dev babel-cli
npm install babel-preset-env
echo "building js"
./node_modules/.bin/babel src --out-dir dst
