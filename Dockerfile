FROM node as br-build

WORKDIR /app

COPY . .

RUN ./build.sh

FROM nginx

COPY --from=br-build /app/dst/ /usr/share/nginx/html/

EXPOSE 80


