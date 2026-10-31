
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/config.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../navigation.dart';
import '../../services/gym_service.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/forms.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';

enum _Status { locating, loading, ready, error, noLocation }

// How many of the nearest gyms the map zooms to show.
const _fitNearest = 8;

/// /gyms: gyms around the member on a map and in a list, nearest first
/// (features/gyms/GymFinder.tsx). Starts from the phone's location, asked for
/// on arrival; a town or address search works without it, and dragging the
/// map offers "Search this area".
class GymScreen extends StatefulWidget {
  const GymScreen({super.key, this.locate = currentPosition, this.findGyms = fetchNearbyGyms});

  /// Where the device is and the gyms around a point (replaceable in tests).
  final Future<LatLng> Function() locate;
  final Future<List<Gym>> Function(LatLng at, int radiusKm) findGyms;

  @override
  State<GymScreen> createState() => _GymScreenState();
}

class _GymScreenState extends State<GymScreen> {
  final _map = MapController();
  final _query = TextEditingController();
  final _keys = <String, GlobalKey>{};
  _Status _status = _Status.locating;
  String? _message;
  bool _openSettings = false;
  LatLng? _you;
  LatLng? _origin;
  String _originLabel = 'you';
  int _radiusKm = 5;
  List<Gym> _gyms = [];
  String? _selectedId;
  bool _moved = false;
  bool _mapReady = false;
  List<Place>? _places;
  bool _searching = false;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _query.addListener(() => setState(() {}));
    // The member came here to find a gym, so ask for the location straight away.
    _locate();
  }

  @override
  void dispose() {
    _query.dispose();
    _map.dispose();
    super.dispose();
  }

  Future<void> _locate() async {
    setState(() {
      _status = _Status.locating;
      _message = null;
      _openSettings = false;
    });
    try {
      final here = await widget.locate();
      if (!mounted) return;
      _you = here;
      await _search(here, 'you', _radiusKm);
    } on LocationProblem catch (problem) {
      if (!mounted) return;
      setState(() {
        _status = _Status.noLocation;
        _message = problem.message;
        _openSettings = problem.openSettings;
      });
    }
  }

  Future<void> _search(LatLng from, String label, int radius) async {
    final id = ++_request;
    setState(() {
      _origin = from;
      _originLabel = label;
      _radiusKm = radius;
      _status = _Status.loading;
      _message = null;
      _selectedId = null;
      _moved = false;
    });
    try {
      final found = await widget.findGyms(from, radius);
      if (!mounted || id != _request) return;
      setState(() {
        _gyms = found;
        _status = _Status.ready;
      });
      _fit();
    } catch (err) {
      if (!mounted || id != _request) return;
      setState(() {
        _gyms = [];
        _message = '$err';
        _status = _Status.error;
      });
      _fit();
    }
  }

  /// Zoom to the search spot and the nearest gyms (or the whole circle when there are none).
  void _fit() {
    final origin = _origin;
    if (!_mapReady || origin == null) return;
    final nearest = _gyms.take(_fitNearest).map((g) => g.point).toList();
    final bounds = nearest.isEmpty
        ? LatLngBounds.fromPoints([
            const Distance().offset(origin, _radiusKm * 1000, 0),
            const Distance().offset(origin, _radiusKm * 1000, 90),
            const Distance().offset(origin, _radiusKm * 1000, 180),
            const Distance().offset(origin, _radiusKm * 1000, 270),
          ])
        : LatLngBounds.fromPoints([origin, ...nearest]);
    _map.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(40), maxZoom: 16));
  }

  Future<void> _findPlaces() async {
    final q = _query.text.trim();
    if (q.length < 2) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _searching = true;
      _places = null;
    });
    try {
      final found = await searchPlaces(q);
      if (!mounted) return;
      setState(() => _places = found.length == 1 ? null : found);
      if (found.length == 1) _search(found.first.point, found.first.label, _radiusKm);
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  void _select(String id, {bool fromMap = false}) {
    setState(() => _selectedId = id);
    final gym = _gyms.where((g) => g.id == id).firstOrNull;
    if (gym == null) return;
    if (fromMap) {
      final item = _keys[id]?.currentContext;
      if (item != null) Scrollable.ensureVisible(item, duration: const Duration(milliseconds: 250), alignment: 0.1);
    } else if (_mapReady && !_map.camera.visibleBounds.contains(gym.point)) {
      _map.move(gym.point, _map.camera.zoom);
    }
  }

  bool get _busy => _status == _Status.locating || _status == _Status.loading;

  @override
  Widget build(BuildContext context) {
    final wide = atLeast(context, Breakpoints.lg);
    final controls = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced([
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(child: PageTitle('Find a gym near you', size: responsive(context, 22.0, md: 30.0))),
            const SizedBox(width: 12),
            FgButton(
              label: 'My location',
              icon: LucideIcons.locateFixed,
              style: FgButtonStyle.secondary,
              height: 36,
              fontSize: 13,
              radius: 10,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              onPressed: _busy ? null : _locate,
            ),
          ],
        ),
        Row(
          children: [
            Expanded(
              child: FgTextField(
                controller: _query,
                hint: 'Search near a town or address',
                semanticLabel: 'Search near a town or address',
                fontSize: 14,
                radius: 12,
                fill: AppColors.obsidianWave,
                textInputAction: TextInputAction.search,
                onSubmitted: (_) => _findPlaces(),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                prefix: const Icon(LucideIcons.search, size: 16, color: AppColors.white70),
              ),
            ),
            const SizedBox(width: 8),
            FgButton(
              label: 'Search',
              height: 42,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              loading: _searching,
              onPressed: _searching || _query.text.trim().length < 2 ? null : _findPlaces,
            ),
          ],
        ),
        Semantics(
          label: 'Search distance',
          container: true,
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text('Within', style: fg(size: 12, weight: FontWeight.w600, color: AppColors.white70)),
              for (final r in gymRadii)
                FgChip(
                  label: '$r km',
                  selected: _radiusKm == r,
                  height: 30,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  onTap: () {
                    final origin = _origin;
                    if (origin != null) {
                      _search(origin, _originLabel, r);
                    } else {
                      setState(() => _radiusKm = r);
                    }
                  },
                ),
            ],
          ),
        ),
        if (_places != null) _placeList(),
        if (_message != null)
          StatusBox(_message!),
        if (_openSettings)
          Align(
            alignment: Alignment.centerLeft,
            child: FgButton(label: 'Open settings', style: FgButtonStyle.secondary, height: 36, fontSize: 13, onPressed: Geolocator.openAppSettings),
          ),
        if (_status == _Status.error && _origin != null)
          Align(
            alignment: Alignment.centerLeft,
            child: FgButton(label: 'Retry', icon: LucideIcons.refreshCw, style: FgButtonStyle.secondary, height: 36, fontSize: 13, onPressed: () => _search(_origin!, _originLabel, _radiusKm)),
          ),
      ], 12),
    );

    final screen = MediaQuery.sizeOf(context);
    final short = screen.height < 500;

    // Phones: one scrolling page, the map above the list.
    if (!wide && !(short && atLeast(context, Breakpoints.sm))) {
      return SitePage(
        active: '/gyms',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            controls,
            const SizedBox(height: 12),
            SizedBox(height: (screen.height * 0.45).clamp(240.0, 460.0), child: _mapView()),
            const SizedBox(height: 16),
            _results(fill: false),
          ],
        ),
      );
    }

    // Tablets and phones on their side: the list beside the map, like a maps app.
    final side = short
        ? SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [controls, const SizedBox(height: 16), _results(fill: false)]))
        : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [controls, const SizedBox(height: 16), Expanded(child: _results(fill: true))]);
    return SitePage(
      active: '/gyms',
      scrollable: false,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [SizedBox(width: wide ? 400 : 340, child: side), const SizedBox(width: 16), Expanded(child: _mapView())],
      ),
    );
  }

  Widget _placeList() {
    final places = _places!;
    return FgCard(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  places.isEmpty ? 'No places found for “${_query.text.trim()}”.' : 'Which place did you mean?',
                  style: fg(size: 13, weight: FontWeight.w700),
                ),
              ),
              IconButton(
                tooltip: 'Close the place list',
                onPressed: () => setState(() => _places = null),
                icon: const Icon(LucideIcons.x, size: 16, color: AppColors.white70),
              ),
            ],
          ),
          for (final p in places)
            InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                setState(() => _places = null);
                _search(p.point, p.label, _radiusKm);
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                child: Row(
                  children: [
                    const Icon(LucideIcons.mapPin, size: 16, color: AppColors.limeLight),
                    const SizedBox(width: 8),
                    Expanded(child: Text(p.label, style: fg(size: 13))),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _mapView() {
    final origin = _origin;
    final you = _you;
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Stack(
        children: [
          Semantics(
            label: 'Map of gyms. The list has the same gyms.',
            container: true,
            child: DecoratedBox(
              decoration: const BoxDecoration(color: AppColors.obsidianWave),
              child: FlutterMap(
                mapController: _map,
                options: MapOptions(
                  initialCenter: const LatLng(20, 0),
                  initialZoom: 2,
                  backgroundColor: AppColors.obsidianWave,
                  interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                  onMapReady: () {
                    _mapReady = true;
                    _fit();
                  },
                  // Only the member's own dragging offers "Search this area".
                  onPositionChanged: (camera, hasGesture) {
                    if (hasGesture && !_moved && _origin != null) setState(() => _moved = true);
                  },
                ),
                children: [
                  // OpenStreetMap tiles, darkened to match the app.
                  darkModeTilesContainerBuilder(
                    context,
                    TileLayer(urlTemplate: AppConfig.mapTilesUrl, userAgentPackageName: 'com.fitguide.app'),
                  ),
                  if (origin != null)
                    CircleLayer(circles: [
                      CircleMarker(
                        point: origin,
                        radius: _radiusKm * 1000,
                        useRadiusInMeter: true,
                        color: AppColors.limeLight.withValues(alpha: 0.05),
                        borderColor: AppColors.limeLight.withValues(alpha: 0.5),
                        borderStrokeWidth: 1,
                      ),
                    ]),
                  MarkerLayer(
                    markers: [
                      if (you != null) Marker(point: you, width: 22, height: 22, child: const _YouDot()),
                      for (final (i, gym) in _gyms.indexed)
                        Marker(
                          point: gym.point,
                          width: 36,
                          height: 36,
                          child: _Pin(
                            number: i + 1,
                            name: gym.displayName,
                            selected: gym.id == _selectedId,
                            onTap: () => _select(gym.id, fromMap: true),
                          ),
                        ),
                    ],
                  ),
                  RichAttributionWidget(
                    alignment: AttributionAlignment.bottomRight,
                    showFlutterMapAttribution: false,
                    attributions: [
                      TextSourceAttribution('OpenStreetMap contributors', onTap: () => openExternal('https://www.openstreetmap.org/copyright')),
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (_busy)
            Positioned.fill(
              child: IgnorePointer(
                child: ColoredBox(
                  color: AppColors.noirEclipse.withValues(alpha: 0.5),
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.noirEclipse.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: AppColors.white30A(0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.limeLight)),
                          const SizedBox(width: 8),
                          Flexible(child: Text(_status == _Status.locating ? 'Finding your location…' : 'Looking for gyms…', style: fg(size: 13, weight: FontWeight.w600))),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (_moved && !_busy)
            Positioned(
              top: 10,
              left: 0,
              right: 0,
              child: Center(
                child: FgButton(
                  label: 'Search this area',
                  icon: LucideIcons.search,
                  height: 36,
                  radius: 999,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  onPressed: () => _search(_map.camera.center, 'this area', _radiusKm),
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// The gyms as a list. With [fill] it takes the height it's given and
  /// scrolls inside it; otherwise it's as tall as its content (the page scrolls).
  Widget _results({required bool fill}) {
    final heading = _status == _Status.ready
        ? '${_gyms.length} ${_gyms.length == 1 ? 'gym' : 'gyms'} within $_radiusKm km of $_originLabel'
        : _busy
            ? 'Searching…'
            : 'Gyms';
    final nextRadius = gymRadii.where((r) => r > _radiusKm).firstOrNull;

    final Widget body;
    if (_status == _Status.ready && _gyms.isEmpty) {
      body = EmptyState(
        icon: LucideIcons.mapPin,
        compact: true,
        title: 'No gyms found within $_radiusKm km',
        text: 'The map data may not list every gym here yet. Try a wider search or another area.',
        action: nextRadius == null || _origin == null
            ? null
            : FgButton(label: 'Search within $nextRadius km', height: 40, radius: 12, fontSize: 14, fontWeight: FontWeight.w800, onPressed: () => _search(_origin!, _originLabel, nextRadius)),
      );
    } else if (_status == _Status.noLocation && _origin == null) {
      body = const EmptyState(
        icon: LucideIcons.locateFixed,
        compact: true,
        title: 'Where should we look?',
        text: 'Search for a town or address above, or allow location to see the gyms around you.',
      );
    } else if (_busy && _gyms.isEmpty) {
      body = Column(children: spaced([for (var i = 0; i < 3; i++) const Skeleton(height: 72)], 8));
    } else {
      // At most 50 gyms, all built so a tapped pin can scroll its card into view.
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          for (final (i, gym) in _gyms.indexed)
            _GymCard(
              key: _keys.putIfAbsent(gym.id, GlobalKey.new),
              gym: gym,
              number: i + 1,
              selected: gym.id == _selectedId,
              onTap: () => _select(gym.id),
            ),
        ], 8),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(liveRegion: true, child: Text(heading, style: fg(size: 13, weight: FontWeight.w700, color: AppColors.white70))),
        const SizedBox(height: 8),
        if (fill) Expanded(child: SingleChildScrollView(child: body)) else body,
        const SizedBox(height: 8),
        Text(
          'Gym data © OpenStreetMap contributors. Your location is only used for this search and isn’t saved.',
          style: fg(size: 11, color: AppColors.white70),
        ),
      ],
    );
  }
}

class _GymCard extends StatelessWidget {
  const _GymCard({super.key, required this.gym, required this.number, required this.selected, required this.onTap});
  final Gym gym;
  final int number;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final walk = walkTime(gym.distanceKm);
    return FgCard(
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      borderColor: selected ? AppColors.limeLight : null,
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              button: true,
              selected: selected,
              child: InkWell(
                onTap: onTap,
                child: Row(
                  children: [
                    ExcludeSemantics(child: _Number(number, selected: selected)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            gym.displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: fg(size: 15, weight: FontWeight.w700, color: gym.name == null ? AppColors.white70 : AppColors.white)
                                .copyWith(fontStyle: gym.name == null ? FontStyle.italic : null),
                          ),
                          if (gym.address != null)
                            Text(gym.address!, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 12, color: AppColors.white70)),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(formatDistance(gym.distanceKm), style: fg(size: 12, weight: FontWeight.w700, color: AppColors.limeLight)),
                              if (walk != null) ...[
                                const SizedBox(width: 8),
                                const Icon(LucideIcons.footprints, size: 12, color: AppColors.white70),
                                const SizedBox(width: 4),
                                Flexible(child: Text(walk, maxLines: 1, overflow: TextOverflow.ellipsis, style: fg(size: 12, color: AppColors.white70))),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Directions to ${gym.displayName}',
            onPressed: () => openExternal(directionsUrl(gym.point)),
            icon: const Icon(LucideIcons.navigation, size: 18, color: AppColors.limeLight),
          ),
        ],
      ),
    );
  }
}

class _Number extends StatelessWidget {
  const _Number(this.number, {required this.selected});
  final int number;
  final bool selected;
  static const double size = 28;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: selected ? AppColors.limeLight : AppColors.noirEclipse,
        border: Border.all(color: AppColors.limeLight, width: 2),
        boxShadow: const [BoxShadow(color: Color(0x80000000), blurRadius: 8, offset: Offset(0, 2))],
      ),
      child: Text('$number', style: fg(size: 12, weight: FontWeight.w800, color: selected ? AppColors.noirEclipse : AppColors.limeLight)),
    );
  }
}

/// A numbered gym pin matching the list.
class _Pin extends StatelessWidget {
  const _Pin({required this.number, required this.name, required this.selected, required this.onTap});
  final int number;
  final String name;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: '$number. $name',
      child: GestureDetector(
        onTap: onTap,
        child: Center(child: AnimatedScale(scale: selected ? 1.25 : 1, duration: const Duration(milliseconds: 150), child: _Number(number, selected: selected))),
      ),
    );
  }
}

/// Where the member is: a blue dot.
class _YouDot extends StatelessWidget {
  const _YouDot();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'You are here',
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFF3B82F6),
          border: Border.all(color: Colors.white, width: 3),
          boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withValues(alpha: 0.3), spreadRadius: 6)],
        ),
      ),
    );
  }
}
