import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/images.dart';
import '../../models/json.dart';

/// Short guides written for FitGuide, and articles written by coaches and
/// admins, shown on the home tab (features/dashboard/articles.ts and
/// services/articleService.ts).
class ArticleSection {
  const ArticleSection(this.heading, this.paragraphs, [this.tip]);

  ArticleSection.fromJson(Json j)
      : heading = asString(j['heading']) ?? '',
        paragraphs = asStrings(j['paragraphs']),
        tip = asString(j['tip']);

  final String heading;
  final List<String> paragraphs;
  final String? tip;
}

class Article {
  const Article({
    required this.id,
    required this.title,
    required this.category,
    required this.readMinutes,
    this.photo,
    this.coverImageUrl,
    required this.description,
    required this.takeaways,
    required this.sections,
    this.actionLabel,
    this.actionHref,
    this.author = articleAuthor,
    this.authorCoachId,
    this.publishedAt,
  });

  /// A published article from /api/articles/posts.
  Article.fromJson(Json j)
      : id = asString(j['slug']) ?? '',
        title = asString(j['title']) ?? '',
        category = asString(j['category']) ?? 'TRAINING',
        readMinutes = asInt(j['readMinutes']) ?? 1,
        photo = null,
        coverImageUrl = asString(j['coverImageUrl']),
        description = asString(j['description']) ?? '',
        takeaways = asStrings(j['takeaways']),
        sections = asJsonList(j['sections']).map(ArticleSection.fromJson).toList(),
        actionLabel = null,
        actionHref = null,
        author = asString(asJson(j['author'])['name']) ?? 'FitGuide',
        authorCoachId = asString(asJson(j['author'])['coachId']),
        publishedAt = asString(j['publishedAt']);

  /// The slug: the article's address on the website is `/articles/<id>`.
  final String id;
  final String title;
  final String category;
  final int readMinutes;

  /// Unsplash photo id (built-in guides).
  final String? photo;

  /// An uploaded or linked cover (written articles).
  final String? coverImageUrl;
  final String description;
  final List<String> takeaways;
  final List<ArticleSection> sections;

  /// Where to put the advice into practice (built-in guides).
  final String? actionLabel;
  final String? actionHref;
  final String author;

  /// Set when the author is an approved coach, for a link to their profile.
  final String? authorCoachId;
  final String? publishedAt;

  /// The picture at [width] pixels wide, or null when there isn't one.
  String? image(int width) => photo != null ? unsplash(photo!, query: 'w=$width&q=75&fit=crop') : assetUrl(coverImageUrl);
}

const articleAuthor = 'FitGuide editorial team';

/// Colour for a category, teal when it's one this build doesn't know.
Color articleColor(String category) => articleCategoryColors[category] ?? const Color(0xFF00C4B4);

const articleCategoryColors = {
  'TRAINING': Color(0xFF00C4B4),
  'NUTRITION': Color(0xFF34D399),
  'RECOVERY': Color(0xFF60A5FA),
};

const articles = [
  Article(
    id: 'progressive-overload',
    title: 'Progressive overload: why your training has to keep getting a little harder',
    category: 'TRAINING',
    readMinutes: 4,
    photo: '1571019614242-c5c5dee9f50b',
    description: 'Your body adapts to what you ask of it. To keep getting stronger, the challenge has to grow, gradually.',
    takeaways: [
      'Muscles and strength improve when training asks a bit more than you are used to.',
      'You can add weight, reps, sets or control; you do not have to add load every week.',
      'Small, steady increases beat big jumps, and keep injury risk down.',
    ],
    sections: [
      ArticleSection(
        'What it means',
        [
          'Progressive overload is the gradual increase in what you ask of your body in training. When a workout is harder than you are used to, your body adapts by getting stronger, building muscle or improving endurance.',
          'If you do the same workout with the same weights week after week, it stops being a challenge and progress slows down.',
        ],
        'Log your sets in the workout player. Your personal records on the Progress tab show when it is time to step up.',
      ),
      ArticleSection('Four ways to progress', [
        'Weight: add a little load once you can complete all your reps with good form.',
        'Reps and sets: go from 3 sets of 8 to 3 sets of 10, or add a set.',
        'Control: slow down the lowering part of each rep to keep the muscle working longer.',
        'Rest: shorten the breaks between sets slightly while keeping your form.',
      ]),
      ArticleSection('Go slowly', [
        'Change one thing at a time and give yourself a week or two at each step. Pain (rather than effort) is a sign to back off.',
      ]),
    ],
    actionLabel: 'Browse strength workouts',
    actionHref: '/workouts#strength',
  ),
  Article(
    id: 'protein-timing',
    title: 'Protein for muscle: how much matters more than when',
    category: 'NUTRITION',
    readMinutes: 3,
    photo: '1490645935967-10de6ba17061',
    description: 'Your total protein over the day matters most. Spreading it across meals helps a little; a strict 30-minute window after training does not.',
    takeaways: [
      'For people building muscle, about 1.6 g of protein per kg of body weight a day covers most needs.',
      'Muscle building stays elevated for a day or more after training, so there is no 30-minute deadline.',
      'Spreading protein over 3–4 meals of roughly 20–40 g each is a simple, effective pattern.',
    ],
    sections: [
      ArticleSection(
        'The "anabolic window"',
        [
          'A popular belief says you must have protein within 30 minutes of training or lose your gains. Research shows the body stays more responsive to protein for many hours after a workout.',
          'Eating a protein-rich meal within a couple of hours of training is sensible, but your total for the day is what counts most.',
        ],
        'The Nutrition page sets a protein target from your weight and goal, and tracks what you eat.',
      ),
      ArticleSection('Spread it out', [
        'Rather than one large protein meal, aim for a portion at each meal: eggs or yoghurt at breakfast, beans, fish or meat at lunch and dinner.',
      ]),
    ],
    actionLabel: 'See your nutrition targets',
    actionHref: '/nutrition',
  ),
  Article(
    id: 'active-recovery',
    title: 'Active recovery: easy movement on your rest days',
    category: 'RECOVERY',
    readMinutes: 3,
    photo: '1518611012118-696072aa579a',
    description: 'Light activity on rest days, like walking or gentle yoga, can ease stiffness and help you feel ready for your next session.',
    takeaways: [
      'Rest days are when your body adapts to training, so keep them easy.',
      'Gentle movement can reduce stiffness and soreness for many people.',
      'Sleep, food and fluids matter more for recovery than any single trick.',
    ],
    sections: [
      ArticleSection(
        'Why move on a rest day?',
        [
          'Sitting still all day after a hard session can leave you stiff. Light movement keeps blood flowing and many people find it makes soreness ease sooner.',
          'Keep it easy: you should be able to hold a conversation the whole time.',
        ],
        'Good options: a 20–30 minute walk, an easy bike ride, a mobility routine or a restorative yoga session.',
      ),
      ArticleSection('The basics still come first', [
        'Most of your recovery happens while you sleep. Aim for 7–9 hours, eat enough protein and drink regularly through the day.',
      ]),
    ],
    actionLabel: 'Try a mobility or yoga session',
    actionHref: '/workouts#flexibility',
  ),
];
