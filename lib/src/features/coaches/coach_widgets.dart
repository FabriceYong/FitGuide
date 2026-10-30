import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/coach.dart';
import '../../navigation.dart';
import '../../services/coach_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/ui.dart';

/// A coach's contact details with buttons to request a spot (or just get in
/// touch). Visitors who aren't signed in are asked to sign in instead
/// (features/coaches/CoachContactCard.tsx).
class CoachContactView extends StatelessWidget {
  const CoachContactView({super.key, required this.coach, this.programTitle, this.inPerson = false});
  final Coach coach;
  final String? programTitle;
  final bool inPerson;

  @override
  Widget build(BuildContext context) {
    final contact = coach.contact;
    if (contact == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sign in to see how to contact ${coach.name}${inPerson ? ' and request a spot' : ''}.', style: fg(size: 14, color: AppColors.white70)),
          const SizedBox(height: 12),
          FgButton(label: 'Sign in', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: context.read<AuthController>().startSignUp),
        ],
      );
    }
    final links = contactLinks(contact, programTitle: programTitle);
    final buttons = <(String, IconData, String)>[
      if (links.email != null) (inPerson ? 'Request a spot' : 'Email', LucideIcons.mail, links.email!),
      if (links.whatsapp != null) ('WhatsApp', LucideIcons.messageCircle, links.whatsapp!),
      if (links.call != null) ('Call', LucideIcons.phone, links.call!),
    ];
    Widget line(IconData icon, String text, [String? href]) => Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(icon, size: 16, color: AppColors.limeLight),
            const SizedBox(width: 8),
            Expanded(
              child: href == null
                  ? Text(text, style: fg(size: 14))
                  : LinkText(text, color: AppColors.white, weight: FontWeight.w400, underline: true, onTap: () => openExternal(href)),
            ),
          ]),
        );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (contact.location != null) line(LucideIcons.mapPin, contact.location!),
        if (contact.email != null) line(LucideIcons.mail, contact.email!, 'mailto:${contact.email}'),
        if (contact.phone != null) line(LucideIcons.phone, contact.phone!, links.call),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final (i, (label, icon, href)) in buttons.indexed)
            FgButton(
              label: label,
              icon: icon,
              style: i == 0 ? FgButtonStyle.primary : FgButtonStyle.secondary,
              height: 40,
              radius: 12,
              fontSize: 14,
              fontWeight: FontWeight.w700,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              onPressed: () => openExternal(href),
            ),
        ]),
      ],
    );
  }
}

/// The coach behind a program, with their contact details for members
/// (features/coaches/ProgramCoach.tsx).
class ProgramCoachCard extends StatefulWidget {
  const ProgramCoachCard({super.key, required this.coachId, required this.programTitle, required this.inPerson});
  final String coachId;
  final String programTitle;
  final bool inPerson;

  @override
  State<ProgramCoachCard> createState() => _ProgramCoachCardState();
}

class _ProgramCoachCardState extends State<ProgramCoachCard> {
  Coach? _coach;
  bool? _loadedSignedIn;

  void _load(bool signedIn) {
    // Load again after signing in, to get the contact details.
    if (_loadedSignedIn == signedIn) return;
    _loadedSignedIn = signedIn;
    fetchCoach(widget.coachId).then((page) {
      if (mounted) setState(() => _coach = page.coach);
    }).catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    _load(context.watch<AuthController>().hasAccount);
    final coach = _coach;
    if (coach == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: FgCard(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.inPerson) ...[
              Row(children: [
                const Icon(LucideIcons.users, size: 16, color: AppColors.limeLight),
                const SizedBox(width: 8),
                Expanded(child: Text('TRAINED IN PERSON: CONTACT THE COACH TO REQUEST A SPOT', style: fg(size: 11, weight: FontWeight.w700, color: AppColors.limeLight, letterSpacing: 0.6))),
              ]),
              const SizedBox(height: 12),
            ],
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Avatar(url: coach.avatarUrl, size: 48, borderColor: AppColors.white30A(0.3), borderWidth: 1),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Wrap(children: [
                    Semantics(header: true, child: Text('Your coach: ', style: fg(size: 16, weight: FontWeight.w800))),
                    LinkText(coach.name, size: 16, color: AppColors.white, weight: FontWeight.w800, underline: true, onTap: () => openCoach(context, coach.id)),
                  ]),
                  if (coach.specialties.isNotEmpty) Text(coach.specialties.join(' · '), style: fg(size: 12, color: AppColors.white70)),
                  const SizedBox(height: 4),
                  Text(coach.bio, maxLines: 3, overflow: TextOverflow.ellipsis, style: fg(size: 14, color: AppColors.white70)),
                ]),
              ),
            ]),
            const SizedBox(height: 16),
            CoachContactView(coach: coach, programTitle: widget.programTitle, inPerson: widget.inPerson),
          ],
        ),
      ),
    );
  }
}
