import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../core/api/api_client.dart';
import '../models/json.dart';

/// Gyms near a point and place search for the gym map
/// (services/gymService.ts): OpenStreetMap data, via the API.
final _api = ApiClient.instance;

class Gym {
  Gym(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']),
        address = asString(j['address']),
        point = LatLng(asDouble(j['lat']) ?? 0, asDouble(j['lng']) ?? 0),
        distanceKm = asDouble(j['distanceKm']) ?? 0;

  final String id;

  /// null when the map data has no name for it.
  final String? name;
  final String? address;
  final LatLng point;
  final double distanceKm;

  String get displayName => name ?? 'Unnamed gym';
}

class Place {
  Place(Json j)
      : label = asString(j['label']) ?? '',
        point = LatLng(asDouble(j['lat']) ?? 0, asDouble(j['lng']) ?? 0);
  final String label;
  final LatLng point;
}

/// The search distances offered, in km.
const gymRadii = [2, 5, 10, 25];

Future<List<Gym>> fetchNearbyGyms(LatLng at, int radiusKm) async {
  final data = await _api.request('/gyms/nearby', query: {'lat': at.latitude, 'lng': at.longitude, 'radius': radiusKm});
  return asJsonList(data['gyms']).map(Gym.new).toList();
}

Future<List<Place>> searchPlaces(String q) async {
  final data = await _api.request('/gyms/places', query: {'q': q});
  return asJsonList(data['places']).map(Place.new).toList();
}

/// "350 m" or "1.2 km".
String formatDistance(double km) {
  if (km < 1) {
    final metres = (km * 100).round() * 10;
    return '${metres < 10 ? 10 : metres} m';
  }
  return '${km < 10 ? km.toStringAsFixed(1) : km.round()} km';
}

/// About how long it takes to walk there at 5 km/h, for gyms within 2 km.
String? walkTime(double km) {
  if (km > 2) return null;
  final minutes = (km / 5 * 60).round();
  return '${minutes < 1 ? 1 : minutes} min walk';
}

/// Turn-by-turn directions in the phone's maps app: Apple Maps on Apple
/// devices, Google Maps elsewhere.
String directionsUrl(LatLng to) {
  final apple = !kIsWeb && (defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS);
  return apple
      ? 'https://maps.apple.com/?daddr=${to.latitude},${to.longitude}'
      : 'https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}';
}

/// Why the device's location isn't available, worded for the member.
class LocationProblem implements Exception {
  const LocationProblem(this.message, {this.openSettings = false});
  final String message;

  /// Location was turned off for the app for good; only the phone's settings can turn it back on.
  final bool openSettings;

  @override
  String toString() => message;
}

/// The device's position, asking for permission the first time.
Future<LatLng> currentPosition() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    throw const LocationProblem('Location is turned off on this device. Turn it on, or search for a town or address instead.');
  }
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
  if (permission == LocationPermission.deniedForever) {
    throw const LocationProblem('Location is turned off for FitGuide. Allow it in Settings, or search for a town or address instead.', openSettings: true);
  }
  if (permission == LocationPermission.denied) {
    throw const LocationProblem('Allow location to see the gyms around you, or search for a town or address instead.');
  }
  try {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 15)),
    );
    return LatLng(position.latitude, position.longitude);
  } catch (_) {
    final last = kIsWeb ? null : await Geolocator.getLastKnownPosition();
    if (last != null) return LatLng(last.latitude, last.longitude);
    throw const LocationProblem('We couldn’t find your location. Search for a town or address instead.');
  }
}
