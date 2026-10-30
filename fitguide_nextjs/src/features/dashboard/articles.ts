/** Short guides written for FitGuide, shown on the home tab. */
import { coverSrc, type ArticleSection, type WrittenArticle } from '../../services/articleService';

export interface Article {
  id: string;
  title: string;
  category: 'TRAINING' | 'NUTRITION' | 'RECOVERY';
  readMinutes: number;
  /** Unsplash photo id. */
  photo: string;
  description: string;
  takeaways: string[];
  sections: ArticleSection[];
  /** Where to put the advice into practice in FitGuide. */
  action: { label: string; href: string };
}

export const AUTHOR = 'FitGuide editorial team';

/**
 * What the article page shows, for a built-in guide or an article a coach or
 * admin wrote (services/articleService.ts).
 */
export interface ArticleView {
  slug: string;
  title: string;
  category: Article['category'];
  readMinutes: number;
  imageUrl: string | null;
  description: string;
  takeaways: string[];
  sections: Article['sections'];
  author: { name: string; href: string | null };
  publishedAt: string | null;
  action: Article['action'] | null;
}

export const unsplashUrl = (photo: string, width: number) => `https://images.unsplash.com/photo-${photo}?w=${width}&q=75&fit=crop`;

export const builtInView = (a: Article): ArticleView => ({
  slug: a.id, title: a.title, category: a.category, readMinutes: a.readMinutes, imageUrl: unsplashUrl(a.photo, 1200),
  description: a.description, takeaways: a.takeaways, sections: a.sections, author: { name: AUTHOR, href: null }, publishedAt: null, action: a.action,
});

export const writtenView = (a: WrittenArticle): ArticleView => ({
  slug: a.slug, title: a.title, category: a.category, readMinutes: a.readMinutes, imageUrl: coverSrc(a.coverImageUrl),
  description: a.description, takeaways: a.takeaways, sections: a.sections,
  author: { name: a.author.name, href: a.author.coachId ? `/coaches/${a.author.coachId}` : null }, publishedAt: a.publishedAt, action: null,
});

export const CATEGORY_COLORS: Record<Article['category'], string> = {
  TRAINING: '#00C4B4',
  NUTRITION: '#34D399',
  RECOVERY: '#60A5FA',
};

export const ARTICLES: Article[] = [
  {
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
      {
        heading: 'What it means',
        paragraphs: [
          'Progressive overload is the gradual increase in what you ask of your body in training. When a workout is harder than you are used to, your body adapts by getting stronger, building muscle or improving endurance.',
          'If you do the same workout with the same weights week after week, it stops being a challenge and progress slows down.',
        ],
        tip: 'Log your sets in the workout player. Your personal records on the Progress tab show when it is time to step up.',
      },
      {
        heading: 'Four ways to progress',
        paragraphs: [
          'Weight: add a little load once you can complete all your reps with good form.',
          'Reps and sets: go from 3 sets of 8 to 3 sets of 10, or add a set.',
          'Control: slow down the lowering part of each rep to keep the muscle working longer.',
          'Rest: shorten the breaks between sets slightly while keeping your form.',
        ],
      },
      {
        heading: 'Go slowly',
        paragraphs: [
          'Change one thing at a time and give yourself a week or two at each step. Pain (rather than effort) is a sign to back off.',
        ],
      },
    ],
    action: { label: 'Browse strength workouts', href: '/workouts#strength' },
  },
  {
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
      {
        heading: 'The "anabolic window"',
        paragraphs: [
          'A popular belief says you must have protein within 30 minutes of training or lose your gains. Research shows the body stays more responsive to protein for many hours after a workout.',
          'Eating a protein-rich meal within a couple of hours of training is sensible, but your total for the day is what counts most.',
        ],
        tip: 'The Nutrition page sets a protein target from your weight and goal, and tracks what you eat.',
      },
      {
        heading: 'Spread it out',
        paragraphs: [
          'Rather than one large protein meal, aim for a portion at each meal: eggs or yoghurt at breakfast, beans, fish or meat at lunch and dinner.',
        ],
      },
    ],
    action: { label: 'See your nutrition targets', href: '/nutrition' },
  },
  {
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
      {
        heading: 'Why move on a rest day?',
        paragraphs: [
          'Sitting still all day after a hard session can leave you stiff. Light movement keeps blood flowing and many people find it makes soreness ease sooner.',
          'Keep it easy: you should be able to hold a conversation the whole time.',
        ],
        tip: 'Good options: a 20–30 minute walk, an easy bike ride, a mobility routine or a restorative yoga session.',
      },
      {
        heading: 'The basics still come first',
        paragraphs: [
          'Most of your recovery happens while you sleep. Aim for 7–9 hours, eat enough protein and drink regularly through the day.',
        ],
      },
    ],
    action: { label: 'Try a mobility or yoga session', href: '/workouts#flexibility' },
  },
];
