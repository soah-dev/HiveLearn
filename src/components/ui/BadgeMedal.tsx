import {
  Award, BookOpen, Calculator, CalendarDays, Crown, Earth, FlaskConical, Flame, Footprints, Gem, GraduationCap, Landmark,
  LucideIcon, Medal, Mountain, PenLine, Route, Shapes, Star, Target, Trophy, Zap,
} from 'lucide-react';
import Hexagon from './Hexagon';

// Keyed by Badge.criteria (see prisma/seed.ts)
const icons: Record<string, LucideIcon> = {
  first_assignment: Footprints,
  perfect_score: Target,
  streak_7: Flame,
  streak_30: CalendarDays,
  mastery_math: Calculator,
  mastery_science: FlaskConical,
  mastery_reading: BookOpen,
  mastery_history: Landmark,
  mastery_english: PenLine,
  mastery_geography: Earth,
  speed_demon: Zap,
  hardmode_hero: Mountain,
  points_1000: Trophy,
  all_rounder: Shapes,
  sat_first_test: GraduationCap,
  sat_score_1000: Star,
  sat_score_1200: Medal,
  sat_score_1400: Crown,
  sat_perfect_section: Gem,
  sat_marathon: Route,
};

interface BadgeMedalProps {
  criteria: string | undefined;
  earned: boolean;
  size?: number;
}

/** A badge as a honeycomb cell: filled honey once earned, an empty outline while locked. */
export default function BadgeMedal({ criteria, earned, size = 64 }: BadgeMedalProps) {
  const Icon = (criteria && icons[criteria]) || Award;
  const iconSize = Math.round(size * 0.36);

  if (!earned) {
    return (
      <Hexagon size={size} tone="outline">
        <Icon width={iconSize} height={iconSize} strokeWidth={1.75} aria-hidden="true" />
      </Hexagon>
    );
  }

  return (
    <Hexagon size={size} tone="soft">
      <Hexagon size={Math.round(size * 0.8)} tone="honey">
        <Icon width={iconSize} height={iconSize} strokeWidth={2} aria-hidden="true" />
      </Hexagon>
    </Hexagon>
  );
}
