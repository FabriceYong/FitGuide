import '../core/api/api_client.dart';
import '../models/coach.dart';
import '../models/json.dart';

/// Coach profiles and applications to coach (services/coachService.ts).
final _api = ApiClient.instance;

class CoachPage {
  CoachPage(this.coach, this.programs);
  final Coach coach;
  final List<CoachProgram> programs;
}

/// A coach's profile and programs. Works signed out; signed-in members also
/// get the contact details.
Future<CoachPage> fetchCoach(String id) async {
  Future<Json> load() => _api.request('/coaches/${Uri.encodeComponent(id)}');
  var data = await load();
  // An expired access token reads as signed out here; refresh and ask again.
  if (data['coach'] is Map && (data['coach'] as Map)['contact'] == null && _api.hasSession && await _api.refreshSession()) {
    data = await load();
  }
  return CoachPage(Coach(asJson(data['coach'])), asJsonList(data['programs']).map(CoachProgram.new).toList());
}

Future<CoachApplication?> fetchMyApplication() async {
  final data = await _api.request('/coaches/application', auth: true);
  return data['application'] == null ? null : CoachApplication(asJson(data['application']));
}

Future<CoachApplication> applyToCoach({
  required String bio,
  required List<String> specialties,
  required String contactEmail,
  required String phone,
  required String location,
}) async {
  final data = await _api.request('/coaches/application', method: 'POST', auth: true, body: {
    'bio': bio,
    'specialties': specialties,
    'contactEmail': contactEmail,
    'phone': phone,
    'location': location,
  });
  return CoachApplication(asJson(data['application']));
}

/// Links that open the member's mail, phone or WhatsApp app with a spot request.
({String? email, String? call, String? whatsapp}) contactLinks(CoachContact contact, {String? programTitle}) {
  final subject = programTitle != null ? 'Spot in $programTitle' : 'Training with you';
  final message = programTitle != null
      ? 'Hi! I found your program "$programTitle" on FitGuide and would like to request a spot.'
      : 'Hi! I found you on FitGuide and would like to train with you.';
  final phone = contact.phone?.trim() ?? '';
  final digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
  return (
    email: contact.email == null ? null : Uri(scheme: 'mailto', path: contact.email, query: 'subject=${Uri.encodeComponent(subject)}&body=${Uri.encodeComponent(message)}').toString(),
    call: phone.isEmpty ? null : 'tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}',
    // WhatsApp needs the number with its country code.
    whatsapp: phone.startsWith('+') && digits.isNotEmpty ? 'https://wa.me/$digits?text=${Uri.encodeComponent(message)}' : null,
  );
}
