# FitGuide Flutter app, built for the web and served by nginx:
#   docker compose build app
# Phones and emulators still use `flutter run` (see README).
FROM debian:bookworm-slim AS build

# Only the web toolchain: no Android SDK, so the download stays small
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git unzip xz-utils \
  && rm -rf /var/lib/apt/lists/*
ARG FLUTTER_VERSION=3.44.6
RUN git clone --depth 1 --branch ${FLUTTER_VERSION} https://github.com/flutter/flutter.git /opt/flutter
ENV PATH=/opt/flutter/bin:$PATH \
    FLUTTER_SUPPRESS_ANALYTICS=true
RUN git config --global --add safe.directory /opt/flutter \
  && flutter config --no-analytics --no-cli-animations \
  && flutter precache --web --no-android --no-ios

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
