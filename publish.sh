#!/bin/bash

echo "bumping version number"
sed -i -r 's/(.*)\.([0-9]+)$/echo "\1.$((\2+1))"/ge' VERSION
version=`cat VERSION` 
date=`date -u`
echo "committing and pushing it"
git add VERSION
git commit -m "bump to ${version} for release"
git push
echo "templating version"
sed -i "s/{{VERSION}}/${version} built at ${date}/g" dst/main-brcat.js 
echo "building docker image"
docker build . -t andimiller/br:${version}
echo "pushing docker image"
docker push andimiller/br:${version}
