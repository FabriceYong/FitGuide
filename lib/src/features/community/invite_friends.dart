import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/api/api_client.dart';
import '../../core/config.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../models/json.dart';
import '../../widgets/ui.dart';

final _api = ApiClient.instance;

class Referrals {
  Referrals(Json j)
      : code = asString(j['code']) ?? '',
        invited = asInt(j['invited']) ?? 0,
        rewarded = asInt(j['rewarded']) ?? 0,
        rewardsLeft = asInt(j['rewardsLeft']) ?? 0,
        plusUntil = asString(j['plusUntil']);
  final String code;
  final int invited;
  final int rewarded;
  final int rewardsLeft;
  final String? plusUntil;

  /// The website's sign-up, with this invite.
  String get link => '${AppConfig.webBase}/?signup=1&invite=$code';
}

/// Invite a friend on the community screen: both get a week of PLUS once
/// they finish their first workout (community/InviteFriends.tsx).
class InviteFriends extends StatefulWidget {
  const InviteFriends({super.key});

  @override
  State<InviteFriends> createState() => _InviteFriendsState();
}

class _InviteFriendsState extends State<InviteFriends> {
  Referrals? _info;

  @override
  void initState() {
    super.initState();
    _api.request('/referrals', auth: true).then((d) {
      if (mounted) setState(() => _info = Referrals(asJson(d['referrals'])));
    }).catchError((Object _) {});
  }

  @override
  Widget build(BuildContext context) {
    final info = _info;
    if (info == null) return const SizedBox.shrink();
    final plusUntil = info.plusUntil;
    return FgCard(
      borderColor: AppColors.limeLight.withValues(alpha: 0.3),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(LucideIcons.gift, size: 20, color: AppColors.limeLight),
          const SizedBox(width: 8),
          Semantics(header: true, child: Text('Invite a friend', style: fg(size: 20, weight: FontWeight.w800))),
        ]),
        const SizedBox(height: 8),
        Text.rich(TextSpan(style: fg(size: 14), children: [
          const TextSpan(text: 'When a friend signs up with your link or code and finishes their first workout, you both get '),
          TextSpan(text: 'a week of FitGuide PLUS', style: fg(size: 14, weight: FontWeight.w700)),
          const TextSpan(text: '.'),
        ])),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Your code', style: fg(size: 11, color: AppColors.white70)),
              SelectableText(info.code, style: fg(size: 18, weight: FontWeight.w800, letterSpacing: 2)),
            ]),
          ),
          IconButton(
            tooltip: 'Copy your invite link',
            icon: const Icon(LucideIcons.copy, size: 18, color: AppColors.white70),
            onPressed: () => Clipboard.setData(ClipboardData(text: info.link)),
          ),
          FgButton(
            label: 'Share',
            icon: LucideIcons.share2,
            height: 40,
            radius: 10,
            fontSize: 13,
            fontWeight: FontWeight.w700,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            onPressed: () {
              final box = context.findRenderObject() as RenderBox?;
              SharePlus.instance.share(ShareParams(
                text: 'Train with me on FitGuide. Sign up with my link (or code ${info.code}) and we both get a week of PLUS after your first workout: ${info.link}',
                sharePositionOrigin: box == null ? null : box.localToGlobal(Offset.zero) & box.size,
              ));
            },
          ),
        ]),
        const SizedBox(height: 8),
        Text(
          '${info.invited == 0 ? 'No one has joined with your link yet.' : '${info.invited} joined with your link, ${info.rewarded} finished a first workout.'}'
          '${plusUntil != null ? ' You have PLUS until ${formatDayLong(plusUntil.substring(0, 10))}.' : ''}'
          '${info.rewardsLeft == 0 ? ' You’ve earned every invite week there is.' : ''}',
          style: fg(size: 12, color: AppColors.white70),
        ),
      ]),
    );
  }
}
