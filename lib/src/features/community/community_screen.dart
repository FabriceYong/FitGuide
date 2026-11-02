import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';

import '../../core/analytics.dart';
import '../../core/api/api_client.dart';
import '../../core/format.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_theme.dart';
import '../../core/units.dart';
import '../../services/social_service.dart';
import '../../state/auth_controller.dart';
import '../../widgets/forms.dart';
import '../../widgets/modal.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/ui.dart';
import '../common/site_page.dart';
import 'activity_feed.dart';

const _metricOptions = [
  ('minutes', 'Active minutes'),
  ('sessions', 'Workouts'),
  ('activeDays', 'Active days'),
  ('steps', 'Steps'),
  ('volume', 'Weight lifted'),
  ('foodDays', 'Days with food logged'),
];

/// /community: friends, the weekly friends leaderboard and challenges
/// (features/community/CommunityView.tsx).
class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  Friends? _friends;
  List<LeaderboardRow> _board = [];
  List<Challenge> _challenges = [];
  Challenge? _open;
  final _code = TextEditingController();
  final _joinCode = TextEditingController();
  final _title = TextEditingController();
  bool _creating = false;
  String _metric = 'minutes';
  String _visibility = 'friends';
  String _start = localToday();
  String _end = shiftDate(localToday(), 13);
  String? _message;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    for (final c in [_code, _joinCode, _title]) {
      c.addListener(() => setState(() {}));
    }
    if (context.read<AuthController>().hasAccount) _refresh();
  }

  @override
  void dispose() {
    _code.dispose();
    _joinCode.dispose();
    _title.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    try {
      final results = await Future.wait([fetchFriends(), fetchLeaderboard('minutes'), fetchChallenges()]);
      if (!mounted) return;
      setState(() {
        _friends = results[0] as Friends;
        _board = results[1] as List<LeaderboardRow>;
        _challenges = results[2] as List<Challenge>;
      });
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    }
  }

  Future<void> _act(Future<void> Function() task, [String? done]) async {
    setState(() => _message = null);
    try {
      await task();
      if (done != null && mounted) setState(() => _message = done);
      await _refresh();
    } catch (err) {
      if (mounted) setState(() => _message = err is ApiError ? err.message : '$err');
    }
  }

  Future<void> _openChallenge(Challenge c) async {
    if (_open?.id == c.id) return setState(() => _open = null);
    try {
      final full = await fetchChallenge(c.id);
      if (mounted) setState(() => _open = full);
    } catch (err) {
      if (mounted) setState(() => _message = '$err');
    }
  }

  Future<void> _pickDate(bool start) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: parseYmd(start ? _start : _end),
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
    );
    if (picked != null) setState(() => start ? _start = ymd(picked) : _end = ymd(picked));
  }

  Future<void> _copyCode() async {
    final friends = _friends;
    if (friends == null) return;
    await Clipboard.setData(ClipboardData(text: friends.friendCode));
    setState(() => _copied = true);
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (mounted) setState(() => _copied = false);
  }

  Widget _dateField(String label, String value, VoidCallback onTap) {
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(label, style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
      const SizedBox(height: 4),
      Material(
        color: AppColors.noirEclipse,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: AppColors.white30A(0.2))),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), child: Text(formatDay(value), style: fg(size: 14))),
        ),
      ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (!auth.hasAccount) {
      return SitePage(
        active: '/community',
        child: FgCard(
          padding: const EdgeInsets.all(20),
          child: Column(children: [
            Text('Sign in to add friends and join challenges.', textAlign: TextAlign.center, style: fg(size: 16, color: AppColors.white70)),
            const SizedBox(height: 16),
            FgButton(label: 'Sign in', radius: 12, fontSize: 14, fontWeight: FontWeight.w700, onPressed: auth.startSignUp),
          ]),
        ),
      );
    }
    final friends = _friends;
    if (friends == null) {
      return SitePage(active: '/community', child: _message != null ? ErrorBox(_message!) : const LoadingRow('Loading your community…'));
    }
    return SitePage(
      active: '/community',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: spaced([
          PageTitle('Community', icon: LucideIcons.users, size: atLeast(context, Breakpoints.md) ? 36 : 30),
          if (_message != null) StatusBox(_message!),
          // Friends' activity and challenges, with the leaderboard and friends in a side column on a wide tablet.
          ...withSidebar(context, [
            const ActivityFeed(),
            FgCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Heading left and button right; the button wraps under it with large text.
                  Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(LucideIcons.trophy, size: 20, color: AppColors.limeLight),
                      const SizedBox(width: 8),
                      Semantics(header: true, child: Text('Challenges', style: fg(size: 20, weight: FontWeight.w800))),
                    ]),
                    FgButton(
                      label: 'New challenge',
                      icon: LucideIcons.plus,
                      height: 34,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      onPressed: () => setState(() {
                        _title.clear();
                        _metric = 'minutes';
                        _visibility = 'friends';
                        _start = localToday();
                        _end = shiftDate(_start, 13);
                        _creating = true;
                      }),
                    ),
                  ]),
                  if (_creating) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Text('Title', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                        const SizedBox(height: 4),
                        FgTextField(controller: _title, maxLength: 100, fontSize: 14, radius: 12, border: AppColors.white30A(0.2)),
                        const SizedBox(height: 12),
                        // Side by side where there's room (`sm:grid-cols-2`).
                        FgGrid(columns: 1, sm: 2, gap: 12, children: [
                          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            Text('Count', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                            const SizedBox(height: 4),
                            FgSelect<String>(value: _metric, semanticLabel: 'Count', options: _metricOptions, onChanged: (v) => setState(() => _metric = v)),
                          ]),
                          Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                            Text('Who can join', style: fg(size: 12, weight: FontWeight.w700, color: AppColors.white70)),
                            const SizedBox(height: 4),
                            FgSelect<String>(
                              value: _visibility,
                              semanticLabel: 'Who can join',
                              options: const [('friends', 'My friends'), ('private', 'Only people with the code')],
                              onChanged: (v) => setState(() => _visibility = v),
                            ),
                          ]),
                        ]),
                        const SizedBox(height: 12),
                        Row(children: [
                          Expanded(child: _dateField('Starts', _start, () => _pickDate(true))),
                          const SizedBox(width: 12),
                          Expanded(child: _dateField('Ends', _end, () => _pickDate(false))),
                        ]),
                        const SizedBox(height: 12),
                        Row(children: [
                          FgButton(
                            label: 'Create',
                            radius: 12,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            height: 40,
                            onPressed: _title.text.trim().length < 3
                                ? null
                                : () => _act(() async {
                                      final c = await createChallenge({'title': _title.text.trim(), 'metric': _metric, 'startDate': _start, 'endDate': _end, 'visibility': _visibility});
                                      final full = await fetchChallenge(c.id);
                                      if (mounted) {
                                        setState(() {
                                          _creating = false;
                                          _open = full;
                                        });
                                      }
                                    }, 'Challenge created.'),
                          ),
                          const SizedBox(width: 8),
                          FgButton(label: 'Cancel', style: FgButtonStyle.ghost, radius: 12, fontSize: 14, fontWeight: FontWeight.w700, height: 40, onPressed: () => setState(() => _creating = false)),
                        ]),
                      ]),
                    ),
                  ],
                  const SizedBox(height: 16),
                  if (_challenges.isEmpty)
                    const EmptyState(
                      icon: LucideIcons.trophy,
                      color: AppColors.amber400,
                      title: 'No challenges yet',
                      text: "Pick a goal like most active minutes in two weeks, invite friends with a code, and see who's ahead.",
                    )
                  else
                    ...spaced([for (final c in _challenges) _challengeTile(c)], 12),
                  const SizedBox(height: 16),
                  Row(children: [
                    Expanded(child: FgTextField(controller: _joinCode, hint: 'Have a challenge code?', fontSize: 14, radius: 12, border: AppColors.white30A(0.2), semanticLabel: 'Challenge code')),
                    const SizedBox(width: 8),
                    FgButton(
                      label: 'Join',
                      style: FgButtonStyle.ghost,
                      radius: 12,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      onPressed: _joinCode.text.trim().isEmpty
                          ? null
                          : () => _act(() async {
                                final c = await joinChallengeByCode(_joinCode.text.trim());
                                _joinCode.clear();
                                if (mounted) setState(() => _open = c);
                                if (mounted) setState(() => _message = 'You joined ${c.title}.');
                              }),
                    ),
                  ]),
                ],
              ),
            ),
          ], [
            FgCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('This week with friends', style: fg(size: 16, weight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('Active minutes over the last 7 days, including connected services.', style: fg(size: 12, color: AppColors.white70)),
                const SizedBox(height: 12),
                _Board(rows: _board, unit: 'min'),
              ]),
            ),
            FgCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(children: [
                  const Icon(LucideIcons.userPlus, size: 16, color: AppColors.limeLight),
                  const SizedBox(width: 8),
                  Flexible(child: Text('Friends', style: fg(size: 16, weight: FontWeight.w800))),
                ]),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('YOUR FRIEND CODE', style: fg(size: 10, weight: FontWeight.w700, color: AppColors.white70, letterSpacing: 0.6)),
                        SelectableText(friends.friendCode, style: fg(size: 18, weight: FontWeight.w700, letterSpacing: 3).copyWith(fontFamily: 'monospace')),
                      ]),
                    ),
                    IconButton(
                      tooltip: 'Copy friend code',
                      onPressed: _copyCode,
                      icon: Icon(_copied ? LucideIcons.check : LucideIcons.copy, size: 16, color: _copied ? AppColors.limeLight : AppColors.white),
                    ),
                  ]),
                ),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(child: FgTextField(controller: _code, hint: "Enter a friend's code", fontSize: 14, radius: 12, border: AppColors.white30A(0.2), semanticLabel: "Friend's code")),
                  const SizedBox(width: 8),
                  FgButton(
                    label: 'Add',
                    radius: 12,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    onPressed: _code.text.trim().isEmpty
                        ? null
                        : () => _act(() async {
                              final result = await addFriend(_code.text.trim());
                              _code.clear();
                              if (mounted) setState(() => _message = result == 'accepted' ? "You're now friends." : 'Friend request sent.');
                            }),
                  ),
                ]),
                if (friends.incoming.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('REQUESTS', style: fgLabel()),
                  const SizedBox(height: 8),
                  for (final f in friends.incoming)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(children: [
                        Expanded(child: Text(f.name, style: fg(size: 14, weight: FontWeight.w600))),
                        _SmallIconButton(icon: LucideIcons.check, label: 'Accept ${f.name}', primary: true, onTap: () => _act(() => acceptFriend(f.friendshipId), "You're now friends with ${f.name}.")),
                        const SizedBox(width: 6),
                        _SmallIconButton(icon: LucideIcons.x, label: 'Decline ${f.name}', onTap: () => _act(() => removeFriend(f.friendshipId))),
                      ]),
                    ),
                ],
                const SizedBox(height: 16),
                Text('FRIENDS (${friends.friends.length})', style: fgLabel()),
                const SizedBox(height: 8),
                if (friends.friends.isEmpty)
                  const EmptyState(
                    compact: true,
                    icon: LucideIcons.users,
                    color: AppColors.pink400,
                    title: 'Train with friends',
                    text: 'Send someone your friend code above, or enter theirs, to compare weeks and join challenges together.',
                  ),
                for (final f in friends.friends)
                  Row(children: [
                    Expanded(child: Text(f.name, style: fg(size: 14, weight: FontWeight.w600))),
                    LinkText('Remove', size: 12, color: AppColors.white70, weight: FontWeight.w400, onTap: () async {
                      if (await confirmDialog(context, title: 'Remove friend?', message: 'Remove ${f.name} from your friends?', confirmText: 'Remove', danger: true)) {
                        _act(() => removeFriend(f.friendshipId));
                      }
                    }),
                  ]),
                for (final f in friends.outgoing)
                  Row(children: [
                    Expanded(child: Text('${f.name} · pending', style: fg(size: 14, color: AppColors.white70))),
                    LinkText('Cancel', size: 12, color: AppColors.white70, weight: FontWeight.w400, onTap: () => _act(() => removeFriend(f.friendshipId))),
                  ]),
              ]),
            ),
          ]),
        ], 16),
      ),
    );
  }

  Widget _challengeTile(Challenge c) {
    final open = _open?.id == c.id ? _open : null;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: AppColors.noirEclipse.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: open != null,
            child: InkWell(
              onTap: () => _openChallenge(c),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.title, style: fg(size: 16, weight: FontWeight.w700)),
                Text(
                  '${c.metricLabel} · ${c.startDate} → ${c.endDate} · ${c.memberCount} ${c.memberCount == 1 ? 'member' : 'members'} · ${c.status[0].toUpperCase()}${c.status.substring(1)}${c.visibility == 'public' ? ' · Official' : ''}',
                  style: fg(size: 12, color: AppColors.white70),
                ),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            if (c.joined && !c.isCreator)
              FgButton(label: 'Leave', style: FgButtonStyle.ghost, height: 34, fontSize: 12, fontWeight: FontWeight.w700, padding: const EdgeInsets.symmetric(horizontal: 12), onPressed: () => _act(() => leaveChallenge(c.id), 'You left ${c.title}.')),
            if (!c.joined && c.status != 'finished')
              FgButton(
                label: 'Join',
                height: 34,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                onPressed: () => _act(() async {
                  final joined = await joinChallenge(c.id);
                  if (mounted) setState(() => _open = joined);
                  track('challenge_joined', path: '/community');
                }, 'You joined ${c.title}.'),
              ),
            if (c.isCreator)
              FgButton(
                label: 'Delete',
                style: FgButtonStyle.ghost,
                textColor: AppColors.red300,
                height: 34,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                onPressed: () async {
                  if (await confirmDialog(context, title: 'Delete challenge?', message: 'Delete ${c.title}?', confirmText: 'Delete', danger: true)) {
                    _act(() => deleteChallenge(c.id), 'Challenge deleted.');
                  }
                },
              ),
          ]),
          if (c.isCreator && c.joinCode != null) ...[
            const SizedBox(height: 8),
            Text.rich(TextSpan(children: [
              TextSpan(text: 'Invite code: ', style: fg(size: 12, color: AppColors.white70)),
              TextSpan(text: c.joinCode, style: fg(size: 12, weight: FontWeight.w700).copyWith(fontFamily: 'monospace')),
            ])),
          ],
          if (open?.leaderboard != null) ...[const SizedBox(height: 12), _Board(rows: open!.leaderboard!, unit: open.unit)],
        ],
      ),
    );
  }
}

class _Board extends StatelessWidget {
  const _Board({required this.rows, required this.unit});
  final List<LeaderboardRow> rows;
  final String unit;

  static const _medals = [AppColors.yellow300, AppColors.gray300, AppColors.amber600];

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) return Text('No scores yet.', style: fg(size: 14, color: AppColors.white70));
    // Weight lifted is scored in kg; shown in the viewer's units.
    final units = context.watch<AuthController>().user?.units ?? Units.metric;
    String score(num value) => unit == 'kg' ? thousands(weightIn(value, units).round()) : thousands(value);
    final shownUnit = unit == 'kg' ? units.weight : unit;
    return Column(
      children: spaced([
        for (final r in rows)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: r.isYou ? AppColors.limeLight.withValues(alpha: 0.1) : AppColors.noirEclipse.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
              border: r.isYou ? Border.all(color: AppColors.limeLight.withValues(alpha: 0.3)) : null,
            ),
            child: Row(children: [
              SizedBox(
                width: 24,
                child: r.rank <= 3
                    ? Semantics(label: 'Rank ${r.rank}', child: Icon(LucideIcons.medal, size: 16, color: _medals[r.rank - 1]))
                    : Text('${r.rank}', textAlign: TextAlign.center, style: fg(size: 14, weight: FontWeight.w800)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text.rich(TextSpan(children: [
                  TextSpan(text: r.name, style: fg(size: 14, weight: FontWeight.w600)),
                  if (r.isYou) TextSpan(text: ' (you)', style: fg(size: 14, color: AppColors.white70)),
                ])),
              ),
              Text.rich(TextSpan(children: [
                TextSpan(text: score(r.score), style: fg(size: 14, weight: FontWeight.w700)),
                TextSpan(text: ' $shownUnit', style: fg(size: 14, color: AppColors.white70)),
              ])),
            ]),
          ),
      ], 6),
    );
  }
}

class _SmallIconButton extends StatelessWidget {
  const _SmallIconButton({required this.icon, required this.label, required this.onTap, this.primary = false});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: primary ? AppColors.limeLight : AppColors.whiteA(0.1),
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: SizedBox(width: 32, height: 32, child: Icon(icon, size: 16, color: primary ? AppColors.noirEclipse : AppColors.white)),
        ),
      ),
    );
  }
}
