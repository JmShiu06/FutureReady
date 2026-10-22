import { CvLanguageName, type CvAiSkillData } from '@workspace/api-client-react';

interface NameItem { text: string; include: boolean }
interface SkillLanguageDraft {
  skills: NameItem[];
  languages: NameItem[];
  extractionLimited: boolean;
}

const languageNames = Object.values(CvLanguageName);

/** Recognize names locally; never copy fluency, contact or narrative text to AI. */
export function recognizeCvLanguageNames(values: string[]): CvLanguageName[] {
  let text = values.join(' ').normalize('NFKC').toLowerCase();
  text = text.replace(/\bbahasa\s+(?:melayu|malaysia)\b/g, 'malay');
  const found: CvLanguageName[] = [];
  for (const name of [...languageNames].sort((a, b) => b.length - a.length)) {
    const escaped = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'gu');
    if (!pattern.test(text)) continue;
    found.push(name);
    text = text.replace(pattern, ' ');
  }
  return found.sort((a, b) => a.localeCompare(b)).slice(0, 12);
}

/** Allowlist construction: old/extra draft properties can never enter the request. */
export function buildCvAiPayload(draft: SkillLanguageDraft): CvAiSkillData {
  const skills = [...new Set(draft.skills.filter(item => item.include)
    .map(item => item.text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')).filter(Boolean))].slice(0, 50);
  const languages = [...new Set(draft.languages.filter(item => item.include)
    .map(item => item.text).filter((name): name is CvLanguageName => languageNames.includes(name as CvLanguageName)))].slice(0, 12);
  return { skills, languages, extractionLimited: draft.extractionLimited };
}
