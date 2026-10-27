# syntax=docker/dockerfile:1
# FitGuide Flutter app, built for the web and served by nginx:
#   docker compose build app
# Phones and emulators still use `flutter run` (see README).
ARG FLUTTER_VERSION=3.44.6
FROM ghcr.io/cirruslabs/flutter:${FLUTTER_VERSION} AS build

WORKDIR /src
COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get
COPY . .

# Baked into the app at build time, like the website's NEXT_PUBLIC_* values
ARG API_URL=http://localhost:5001/api
ARG WEB_URL=http://localhost:3000
RUN flutter build web --release \
    --dart-define=API_URL=${API_URL} \
    --dart-define=WEB_URL=${WEB_URL}

FROM nginx:1.27-alpine
COPY --from=build /src/build/web /usr/share/nginx/html
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
EOF
