import {
  BookOpen, Calculator, CodeXml, Earth, FlaskConical, Landmark, Languages, LucideIcon, Music, NotebookPen, Palette, PenLine,
} from 'lucide-react';
import Hexagon, { HexTone } from './Hexagon';

const icons: Record<string, LucideIcon> = {
  math: Calculator,
  reading: BookOpen,
  science: FlaskConical,
  history: Landmark,
  english: PenLine,
  geography: Earth,
  art: Palette,
  music: Music,
  computer_science: CodeXml,
  foreign_languages: Languages,
};

/** A subject's icon in a honeycomb cell. Subjects are told apart by icon, not colour. */
export default function SubjectIcon({ subject, size = 40, tone = 'soft' }: { subject: string; size?: number; tone?: HexTone }) {
  const Icon = icons[subject] ?? NotebookPen;
  const iconSize = Math.round(size * 0.44);
  return (
    <Hexagon size={size} tone={tone}>
      <Icon width={iconSize} height={iconSize} strokeWidth={2} aria-hidden="true" />
    </Hexagon>
  );
}
