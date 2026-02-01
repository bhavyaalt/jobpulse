import { NextResponse } from 'next/server';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type?: string;
  salary?: string;
  url: string;
  source: string;
  posted?: string;
  tags?: string[];
  level?: string;
}

// Data-related keywords for filtering
const DATA_KEYWORDS = [
  'data', 'analyst', 'analytics', 'scientist', 'science', 'engineer',
  'sql', 'python', 'tableau', 'power bi', 'excel', 'statistics',
  'machine learning', 'ml', 'ai', 'database', 'etl', 'bi ',
  'business intelligence', 'visualization', 'reporting', 'insights'
];

// Entry level indicators
const ENTRY_LEVEL_KEYWORDS = [
  'junior', 'entry', 'associate', 'graduate', 'intern', 'trainee',
  'early career', 'new grad', 'fresher', 'level 1', 'l1', 'i ', 'i,',
  '0-2 years', '1-2 years', '0-1 year', 'no experience'
];

// Senior indicators to exclude
const SENIOR_KEYWORDS = [
  'senior', 'sr.', 'sr ', 'lead', 'principal', 'staff', 'manager',
  'director', 'head of', 'vp', 'chief', '5+ years', '7+ years', '10+ years'
];

function isDataRole(job: { title: string; tags?: string[] }): boolean {
  const titleLower = job.title.toLowerCase();
  const tagsLower = job.tags?.map(t => t.toLowerCase()).join(' ') || '';
  const combined = `${titleLower} ${tagsLower}`;
  
  return DATA_KEYWORDS.some(keyword => combined.includes(keyword));
}

function isEntryLevel(job: { title: string; type?: string }): boolean {
  const titleLower = job.title.toLowerCase();
  const typeLower = job.type?.toLowerCase() || '';
  const combined = `${titleLower} ${typeLower}`;
  
  // Exclude senior roles
  if (SENIOR_KEYWORDS.some(keyword => combined.includes(keyword))) {
    return false;
  }
  
  // Include if explicitly entry level, or if no level specified (could be entry)
  const isExplicitlyEntry = ENTRY_LEVEL_KEYWORDS.some(keyword => combined.includes(keyword));
  const hasNoLevelIndicator = !SENIOR_KEYWORDS.some(keyword => combined.includes(keyword)) &&
                               !combined.includes('mid') && !combined.includes('intermediate');
  
  return isExplicitlyEntry || hasNoLevelIndicator;
}

// RemoteOK - Free public API
async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const res = await fetch('https://remoteok.com/api?tag=data', {
      headers: { 'User-Agent': 'JobPulse/1.0' },
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    return data.slice(1, 100).map((job: any) => ({
      id: `remoteok-${job.id}`,
      title: job.position || 'Unknown',
      company: job.company || 'Unknown',
      location: job.location || 'Remote',
      salary: job.salary_min && job.salary_max ? `$${job.salary_min}-${job.salary_max}` : undefined,
      url: job.url || `https://remoteok.com/l/${job.id}`,
      source: 'RemoteOK',
      posted: job.date,
      tags: job.tags || [],
    }));
  } catch (e) {
    console.error('RemoteOK error:', e);
    return [];
  }
}

// Remotive - Free API with category filter
async function fetchRemotive(): Promise<Job[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?category=data&limit=100', {
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    return data.jobs.map((job: any) => ({
      id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Remote',
      type: job.job_type,
      salary: job.salary || undefined,
      url: job.url,
      source: 'Remotive',
      posted: job.publication_date,
      tags: job.tags || [],
    }));
  } catch (e) {
    console.error('Remotive error:', e);
    return [];
  }
}

// Arbeitnow - Free API
async function fetchArbeitnow(): Promise<Job[]> {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    return data.data.slice(0, 100).map((job: any) => ({
      id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location || 'Remote',
      type: job.remote ? 'Remote' : 'On-site',
      url: job.url,
      source: 'Arbeitnow',
      posted: job.created_at,
      tags: job.tags || [],
    }));
  } catch (e) {
    console.error('Arbeitnow error:', e);
    return [];
  }
}

// Jobicy - Free API for remote jobs
async function fetchJobicy(): Promise<Job[]> {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=100&industry=data-science', {
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    if (!data.jobs) return [];
    
    return data.jobs.map((job: any) => ({
      id: `jobicy-${job.id}`,
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo || 'Remote',
      type: job.jobType,
      salary: job.annualSalaryMin && job.annualSalaryMax 
        ? `$${job.annualSalaryMin}-${job.annualSalaryMax}` 
        : undefined,
      url: job.url,
      source: 'Jobicy',
      posted: job.pubDate,
      tags: job.jobIndustry ? [job.jobIndustry] : [],
    }));
  } catch (e) {
    console.error('Jobicy error:', e);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const location = searchParams.get('location')?.toLowerCase() || '';
  const source = searchParams.get('source') || '';
  const entryOnly = searchParams.get('entry') !== 'false'; // Default: entry level only

  // Fetch from all sources in parallel
  const [remoteok, remotive, arbeitnow, jobicy] = await Promise.all([
    fetchRemoteOK(),
    fetchRemotive(),
    fetchArbeitnow(),
    fetchJobicy(),
  ]);

  let allJobs = [...remoteok, ...remotive, ...arbeitnow, ...jobicy];

  // Filter for data roles
  allJobs = allJobs.filter(job => isDataRole(job));

  // Filter for entry level (exclude senior roles)
  if (entryOnly) {
    allJobs = allJobs.filter(job => isEntryLevel(job));
  }

  // Apply additional filters
  if (query) {
    allJobs = allJobs.filter(job => 
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  if (location) {
    allJobs = allJobs.filter(job => 
      job.location.toLowerCase().includes(location)
    );
  }

  if (source) {
    allJobs = allJobs.filter(job => job.source === source);
  }

  // Sort by recency
  allJobs.sort((a, b) => {
    if (!a.posted || !b.posted) return 0;
    return new Date(b.posted).getTime() - new Date(a.posted).getTime();
  });

  return NextResponse.json({
    jobs: allJobs,
    total: allJobs.length,
    sources: {
      remoteok: remoteok.length,
      remotive: remotive.length,
      arbeitnow: arbeitnow.length,
      jobicy: jobicy.length,
    }
  });
}
