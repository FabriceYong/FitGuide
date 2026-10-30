import 'json.dart';

/// How to reach a coach. Only signed-in members get it.
class CoachContact {
  CoachContact(Json j)
      : email = asString(j['email']),
        phone = asString(j['phone']),
        location = asString(j['location']);

  final String? email;
  final String? phone;
  final String? location;
}

/// GET /coaches/:id: an approved coach's public profile.
class Coach {
  Coach(Json j)
      : id = asString(j['id']) ?? '',
        name = asString(j['name']) ?? '',
        avatarUrl = asString(j['avatarUrl']),
        bio = asString(j['bio']) ?? '',
        specialties = asStrings(j['specialties']),
        contact = j['contact'] == null ? null : CoachContact(asJson(j['contact']));

  final String id;
  final String name;
  final String? avatarUrl;
  final String bio;
  final List<String> specialties;

  /// null for visitors who aren't signed in.
  final CoachContact? contact;
}

/// One of a coach's published programs.
class CoachProgram {
  CoachProgram(Json j)
      : slug = asString(j['slug']) ?? '',
        title = asString(j['title']) ?? '',
        level = asString(j['level']) ?? '',
        weeks = asInt(j['weeks']) ?? 0,
        totalDays = asInt(j['totalDays']) ?? 0,
        inPerson = asBool(j['inPerson']);

  final String slug;
  final String title;
  final String level;
  final int weeks;
  final int totalDays;
  final bool inPerson;
}

/// The signed-in member's application to coach (GET /coaches/application).
class CoachApplication {
  CoachApplication(Json j)
      : status = asString(j['status']) ?? 'pending',
        bio = asString(j['bio']) ?? '',
        specialties = asStrings(j['specialties']),
        contactEmail = asString(j['contactEmail']),
        phone = asString(j['phone']),
        location = asString(j['location']),
        reviewNote = asString(j['reviewNote']);

  /// pending | approved | declined
  final String status;
  final String bio;
  final List<String> specialties;
  final String? contactEmail;
  final String? phone;
  final String? location;
  final String? reviewNote;
}
