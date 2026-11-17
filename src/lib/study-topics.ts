import { SUBJECTS } from './subjects';

type SubjectKey = (typeof SUBJECTS)[number]['value'];

/**
 * Starter topics for the study picker, per subject and grade band
 * (grades 1-2, 3-5, 6-8, 9-12). They are ideas to tap, not a limit: students
 * can type any topic.
 */
const TOPICS: Record<SubjectKey, [string[], string[], string[], string[]]> = {
  math: [
    ['Counting to 100', 'Adding within 20', 'Subtracting within 20', 'Tens and ones', 'Telling time', 'Shapes and their sides'],
    ['Multiplication tables', 'Long division', 'Fractions', 'Decimals', 'Area and perimeter', 'Place value'],
    ['Ratios and proportions', 'Percentages', 'Negative numbers', 'Solving linear equations', 'The Pythagorean theorem', 'Probability'],
    ['Quadratic equations', 'Functions and their graphs', 'Trigonometric ratios', 'Exponents and logarithms', 'Systems of equations', 'Introduction to derivatives'],
  ],
  reading: [
    ['Characters and setting', 'Beginning, middle and end', 'Main idea of a story', 'Rhyming words', 'Making predictions', 'Retelling a story'],
    ['Main idea and details', 'Making inferences', 'Cause and effect', 'Compare and contrast', 'Context clues', 'Fact and opinion'],
    ['Theme', 'Point of view', 'Figurative language', "Author's purpose", 'Text structure', 'Summarizing'],
    ['Analyzing arguments', 'Tone and mood', 'Symbolism', 'Rhetorical devices', 'Irony', 'Evaluating sources'],
  ],
  science: [
    ['Living and non-living things', 'Parts of a plant', 'The five senses', 'Weather and seasons', 'Animal habitats', 'Solids, liquids and gases'],
    ['The water cycle', 'Food chains', 'States of matter', 'The solar system', 'Forces and motion', 'Life cycles'],
    ['Cells', 'Photosynthesis', 'Atoms and elements', 'Plate tectonics', 'Energy transfer', 'The periodic table'],
    ["Newton's laws of motion", 'Chemical bonding', 'DNA and genetics', 'Natural selection', 'Balancing chemical equations', 'Electric circuits'],
  ],
  history: [
    ['Then and now', 'National symbols', 'Famous inventors', 'Reading a timeline', 'Community helpers', 'Why we celebrate holidays'],
    ['Ancient Egypt', 'Ancient Greece', 'Native American cultures', 'Age of exploration', 'The thirteen colonies', 'The American Revolution'],
    ['The Roman Empire', 'The Middle Ages', 'The Renaissance', 'The US Constitution', 'The Civil War', 'The Industrial Revolution'],
    ['World War I', 'World War II', 'The Cold War', 'The Civil Rights Movement', 'The French Revolution', 'Imperialism'],
  ],
  english: [
    ['Nouns and verbs', 'Capital letters and periods', 'Writing a complete sentence', 'Adjectives', 'Singular and plural', 'Vowels and consonants'],
    ['Parts of speech', 'Subject-verb agreement', 'Verb tenses', 'Using commas', 'Writing a paragraph', 'Synonyms and antonyms'],
    ['Clauses and phrases', 'Active and passive voice', 'Writing a thesis statement', 'Commonly confused words', 'Pronouns and antecedents', 'Semicolons and colons'],
    ['Essay structure', 'Parallel structure', 'Citing evidence', 'Writing concisely', 'Counterarguments', 'Rhetorical analysis'],
  ],
  geography: [
    ['Reading a simple map', 'Land and water', 'Continents and oceans', 'North, south, east and west', 'Cities, towns and countryside', 'Weather around the world'],
    ['Latitude and longitude', 'Landforms', 'US states and regions', 'Climate zones', 'Map scale and keys', 'Natural resources'],
    ['Biomes of the world', 'Population and migration', 'Rivers and watersheds', 'Urbanization', 'World climates', 'Types of maps'],
    ['Globalization', 'Human-environment interaction', 'Development indicators', 'Borders and geopolitics', 'Climate change', 'The demographic transition'],
  ],
  art: [
    ['Primary and secondary colors', 'Lines and shapes', 'Patterns', 'Warm and cool colors', 'Texture', 'Self-portraits'],
    ['The color wheel', 'Elements of art', 'Foreground and background', 'Symmetry in art', 'Vincent van Gogh', 'Sculpture'],
    ['One-point perspective', 'Shading and value', 'Principles of design', 'Impressionism', 'Color theory', 'Composition'],
    ['Renaissance art', 'Cubism', 'Abstract art', 'Composition in photography', 'Graphic design basics', 'How to critique art'],
  ],
  music: [
    ['Beat and rhythm', 'High and low sounds', 'Fast and slow music', 'Loud and soft music', 'Instrument families', 'The musical alphabet'],
    ['Reading notes on the staff', 'Note values', 'Time signatures', 'Melody and harmony', 'Dynamics', 'Instruments of the orchestra'],
    ['Major and minor scales', 'Key signatures', 'Intervals', 'Chords', 'Syncopation', 'Musical form'],
    ['The circle of fifths', 'Chord progressions', 'Modes', 'Song structure', 'Periods of music history', 'Harmony'],
  ],
  computer_science: [
    ['What is a computer?', 'Parts of a computer', 'Step-by-step instructions', 'Patterns and sequences', 'Staying safe online', 'Using a keyboard'],
    ['Algorithms', 'Loops', 'If-then decisions', 'Debugging', 'Internet safety', 'How computers store information'],
    ['Variables', 'Functions', 'Binary numbers', 'How the internet works', 'Lists and arrays', 'Cybersecurity basics'],
    ['Object-oriented programming', 'Recursion', 'Sorting algorithms', 'Big O notation', 'Data structures', 'Databases'],
  ],
  foreign_languages: [
    ['Spanish greetings', 'Spanish numbers 1 to 10', 'Spanish colors', 'French greetings', 'Spanish days of the week', 'Spanish family words'],
    ['Introducing yourself in Spanish', 'Spanish numbers to 100', 'Telling time in Spanish', 'Spanish food words', 'French numbers and colors', 'Introducing yourself in French'],
    ['Spanish present-tense verbs', 'Ser and estar in Spanish', 'Gender of Spanish nouns', 'Spanish question words', 'French articles', 'French present-tense verbs'],
    ['Spanish preterite and imperfect', 'The Spanish subjunctive', 'Spanish object pronouns', 'Spanish commands', 'French passé composé', 'German noun cases'],
  ],
};

/** Topic ideas for a subject at a grade; empty for a subject without a list. */
export function suggestedTopics(subject: string, grade: number): string[] {
  const band = grade <= 2 ? 0 : grade <= 5 ? 1 : grade <= 8 ? 2 : 3;
  return (TOPICS as Record<string, string[][]>)[subject]?.[band] ?? [];
}
