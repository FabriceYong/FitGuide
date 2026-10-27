import 'json.dart';

/// The signed-in user (or a guest), as /auth/me returns it. Keeps every field
/// the API sends, like the website's AuthUser, so updates can be merged in.
class AppUser {
  AppUser(Json data) : data = Map.unmodifiable(data);

  final Map<String, dynamic> data;

  String get id => asString(data['id']) ?? '';
  String get name => asString(data['name']) ?? '';
  String? get email => asString(data['email']);
  String? get gender => asString(data['gender']);
  double? get height => asDouble(data['height']);
  double? get weight => asDouble(data['weight']);
  double? get targetWeight => asDouble(data['targetWeight']);
  String? get fitnessLevel => asString(data['fitnessLevel']);
  String? get activityStatus => asString(data['activityStatus']);
  String? get goal => asString(data['goal']);
  String? get diet => asString(data['diet']);
  String? get avatarUrl => asString(data['avatarUrl']);
  int? get birthYear => asInt(data['birthYear']);
  bool get showOnLeaderboards => data['showOnLeaderboards'] != false;
  List<String> get focusAreas => asStrings(data['focusAreas']);
  List<String> get equipment => asStrings(data['equipment']);
  List<String> get limitations => asStrings(data['limitations']);
  int? get workoutMinutes => asInt(data['workoutMinutes']);
  int? get daysPerWeek => asInt(data['daysPerWeek']);
  String? get createdAt => asString(data['createdAt']);
  String get role => asString(data['role']) ?? 'user';
  String get plan => asString(data['plan']) ?? 'free';
  bool get isGuest => data['isGuest'] == true;

  bool get isPlus => plan == 'plus';
  bool get isAdmin => role == 'admin';
  bool get isCreator => role == 'creator' || role == 'admin';
  String get firstName => name.split(' ').first;

  AppUser merge(Json updates) => AppUser({...data, ...updates});
}
