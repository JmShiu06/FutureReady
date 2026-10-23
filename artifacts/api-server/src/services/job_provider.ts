import { sampleJobs } from '../data/sampleJobs';

/** Provider-owned sample data. No real advertisements are scraped or copied. */
export type EmploymentType = "full-time" | "part-time" | "contract" | "internship";
export type JobSort = "relevance" | "recent";
export interface JobListing {
  id: string; title: string; company: string; location: string;
  state: string | null; city: string | null; remote: boolean;
  salaryMin: number | null; salaryMax: number | null;
  employmentType: EmploymentType; shortDescription: string; description: string;
  requiredSkills: string[]; externalUrl: string | null; datePosted: string;
  companyInfo: string; demo: boolean;
  occupationId: string; occupationName: string; mascoCode: string;
  onetCode: string; onetTitle: string; mappingNote: string;
  mappingStatus: "verified" | "unverified";
  workMode: "on-site" | "hybrid" | "remote"; level: "entry" | "mid" | "senior";
  sdgRoleId: string; sdgTags: number[];
}
export interface JobFilters {
  page: number; limit: number; q?: string;
  minSalary?: number; maxSalary?: number; state?: string; city?: string;
  remote?: boolean; employmentType?: EmploymentType; sort: JobSort;
}
export interface JobPage {
  jobs: JobListing[]; page: number; limit: number; total: number; totalPages: number;
}
export interface JobMatchScore {
  jobId: string; score: number; matchedSkills: string[]; missingSkills: string[]; skillsConsidered: number;
}
export interface JobProvider {
  listJobs(filters: JobFilters): Promise<JobPage>;
  getJobDetails(id: string): Promise<JobListing | null>;
  matchJobs(candidateSkills: string[], jobIds?: string[]): Promise<JobMatchScore[]>;
}
function normalize(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}
export class DemoJobProvider implements JobProvider {
  constructor(private readonly catalogue: readonly JobListing[] = sampleJobs) {}

  async listJobs(filters: JobFilters): Promise<JobPage> {
    const queryTerms = normalize(filters.q ?? "").split(" ").filter(Boolean);
    let jobs = this.catalogue.filter(job => {
      const searchable = normalize([job.title, job.company, job.occupationName, job.mascoCode, job.onetTitle, ...job.requiredSkills].join(" "));
      if (!queryTerms.every(term => searchable.includes(term))) return false;
      if (filters.minSalary !== undefined && (job.salaryMin === null || job.salaryMin < filters.minSalary)) return false;
      if (filters.maxSalary !== undefined && (job.salaryMin === null || job.salaryMin > filters.maxSalary)) return false;
      if (filters.state && normalize(job.state ?? "") !== normalize(filters.state)) return false;
      if (filters.city && normalize(job.city ?? "") !== normalize(filters.city)) return false;
      if (filters.remote !== undefined && job.remote !== filters.remote) return false;
      if (filters.employmentType && job.employmentType !== filters.employmentType) return false;
      return true;
    });
    if (filters.sort === "relevance" && queryTerms.length) {
      const relevance = (job: JobListing) => {
        const title = normalize(job.title);
        const company = normalize(job.company);
        return queryTerms.reduce(
          (score, term) => score + (title.includes(term) ? 3 : 0) + (company.includes(term) ? 2 : 0) +
            (job.requiredSkills.some(skill => normalize(skill).includes(term)) ? 1 : 0), 0);
      };
      jobs = jobs.sort((a, b) => relevance(b) - relevance(a) || b.datePosted.localeCompare(a.datePosted) || a.id.localeCompare(b.id));
    } else jobs = jobs.sort((a, b) => b.datePosted.localeCompare(a.datePosted) || a.id.localeCompare(b.id));
    const total = jobs.length;
    const start = (filters.page - 1) * filters.limit;
    return { jobs: jobs.slice(start, start + filters.limit), page: filters.page, limit: filters.limit, total, totalPages: Math.ceil(total / filters.limit) };
  }
  async getJobDetails(id: string): Promise<JobListing | null> {
    return this.catalogue.find(job => job.id === id) ?? null;
  }
  async matchJobs(candidateSkills: string[], jobIds?: string[]): Promise<JobMatchScore[]> {
    // Original exact-normalized overlap formula and rounding, unchanged.
    const candidate = new Set(candidateSkills.map(normalize).filter(Boolean));
    const selected = jobIds ? new Set(jobIds) : null;
    return this.catalogue.filter(job => !selected || selected.has(job.id)).map(job => {
      const matchedSkills = job.requiredSkills.filter(skill => candidate.has(normalize(skill)));
      const missingSkills = job.requiredSkills.filter(skill => !candidate.has(normalize(skill)));
      return {
        jobId: job.id,
        score: job.requiredSkills.length ? Math.round((matchedSkills.length / job.requiredSkills.length) * 100) : 0,
        matchedSkills, missingSkills, skillsConsidered: job.requiredSkills.length,
      };
    });
  }
}
export const jobProvider: JobProvider = new DemoJobProvider();
