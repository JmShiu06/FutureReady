import type { CvCareerData } from "@workspace/api-zod";

export const CV_EXTRACTION_LIMITATION = "Some information may be incomplete due to CV extraction limitations.";
type Section = "education" | "workExperience" | "certifications" | "projects" | "languages";
const headings: [RegExp, Section][] = [
  [/^(?:education(?: background)?|academic (?:background|qualifications)|qualifications)$/i, "education"],
  [/^(?:(?:previous |professional |relevant |work |employment )?experience|employment(?: history)?|work history)$/i, "workExperience"],
  [/^(?:certifications?|certificates?|licenses?(?: and certifications)?|professional certifications)$/i, "certifications"],
  [/^(?:(?:selected |academic |personal )?projects?|portfolio)$/i, "projects"],
  [/^(?:(?:spoken )?languages?|language skills)$/i, "languages"],
];

/** Minimize structured fields, not a full-document "summary". No personal header is returned. */
export function redactCvContacts(value: string): string {
  return value.normalize("NFKC")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[contact removed]")
    .replace(/(?:https?:\/\/|www\.)\S+/gi, "[link removed]")
    .replace(/(?:\+?\d[\d ()-]{6,}\d)/g, match =>
      match.replace(/\D/g, "").length >= 9 ? "[contact removed]" : match)
    .replace(/\s+/g, " ").trim();
}

export function buildCvCareerData(text: string, skills: string[]): CvCareerData {
  const fields: Record<Section, string[]> = {
    education: [], workExperience: [], certifications: [], projects: [], languages: [],
  };
  let current: Section | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[•*–-]\s*/, "");
    if (!line) continue;
    const separator = line.indexOf(":");
    const label = (separator >= 0 ? line.slice(0, separator) : line).trim();
    const found = headings.find(([pattern]) => pattern.test(label));
    if (found) {
      current = found[1];
      if (separator < 0 || !line.slice(separator + 1).trim()) continue;
    } else if (/^(?:skills|technical skills|soft skills|summary|profile|objective|contact|personal details|references?|interests|achievements|awards|volunteering)\s*:?\s*$/i.test(line)) {
      current = undefined;
      continue;
    }
    if (!current || /^(?:name|full name|address|phone|mobile|telephone|email|contact|linkedin|reference)\s*:/i.test(line)) continue;
    const content = redactCvContacts(found ? line.slice(separator + 1) : line).slice(0, 400);
    if (content && fields[current].length < 6 && !fields[current].includes(content)) fields[current].push(content);
  }
  return {
    skills: skills.slice(0, 50),
    ...fields,
    // Heading-based extraction is not a calibrated confidence measurement.
    extractionLimited: true,
  };
}

export function categorizeCvSkill(name: string): "Technical Skills" | "Soft Skills" | "Languages" | "Certifications" | "Other Skills" {
  if (/\b(?:communication|leadership|teamwork|collaboration|critical thinking|problem solving|creativity|adaptability|negotiation|time management|storytelling|facilitation|empathy)\b/i.test(name)) return "Soft Skills";
  if (/^(?:english|malay|bahasa melayu|mandarin|tamil|arabic|japanese|korean|french|spanish)$/i.test(name)) return "Languages";
  if (/\b(?:certified|certification|certificate)\b/i.test(name)) return "Certifications";
  if (/\b(?:python|sql|java|programming|software|data|cloud|web|excel|power bi|tableau|docker|git|network|security|analysis|design|engineering|machine learning|statistics|linux)\b/i.test(name)) return "Technical Skills";
  return "Other Skills";
}
