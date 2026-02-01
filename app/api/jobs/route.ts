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
}

// RemoteOK - Free public API
async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'DataJobs/1.0' },
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    return data.slice(1, 150).map((job: any) => ({
      id: `remoteok-${job.id || Math.random()}`,
      title: job.position || 'Unknown',
      company: job.company || 'Unknown',
      location: job.location || 'Remote',
      salary: job.salary_min && job.salary_max ? `$${job.salary_min}-${job.salary_max}` : undefined,
      url: job.url || `https://remoteok.com/l/${job.id}`,
      source: 'RemoteOK',
      posted: job.date,
      tags: Array.isArray(job.tags) ? job.tags : [],
    }));
  } catch (e) {
    console.error('RemoteOK error:', e);
    return [];
  }
}

// Remotive - Free API
async function fetchRemotive(): Promise<Job[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=100', {
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.jobs || !Array.isArray(data.jobs)) return [];
    
    return data.jobs.map((job: any) => ({
      id: `remotive-${job.id || Math.random()}`,
      title: job.title || 'Unknown',
      company: job.company_name || 'Unknown',
      location: job.candidate_required_location || 'Remote',
      type: job.job_type,
      salary: job.salary || undefined,
      url: job.url,
      source: 'Remotive',
      posted: job.publication_date,
      tags: Array.isArray(job.tags) ? job.tags : [],
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
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    
    return data.data.slice(0, 100).map((job: any) => ({
      id: `arbeitnow-${job.slug || Math.random()}`,
      title: job.title || 'Unknown',
      company: job.company_name || 'Unknown',
      location: job.location || 'Remote',
      type: job.remote ? 'Remote' : 'On-site',
      url: job.url,
      source: 'Arbeitnow',
      posted: job.created_at,
      tags: Array.isArray(job.tags) ? job.tags : [],
    }));
  } catch (e) {
    console.error('Arbeitnow error:', e);
    return [];
  }
}

// Jobicy - Free API
async function fetchJobicy(): Promise<Job[]> {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=100', {
      next: { revalidate: 600 }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.jobs || !Array.isArray(data.jobs)) return [];
    
    return data.jobs.map((job: any) => ({
      id: `jobicy-${job.id || Math.random()}`,
      title: job.jobTitle || 'Unknown',
      company: job.companyName || 'Unknown',
      location: job.jobGeo || 'Remote',
      type: job.jobType,
      salary: job.annualSalaryMin && job.annualSalaryMax 
        ? `$${job.annualSalaryMin}-${job.annualSalaryMax}` 
        : undefined,
      url: job.url,
      source: 'Jobicy',
      posted: job.pubDate,
      tags: typeof job.jobIndustry === 'string' ? [job.jobIndustry] : [],
    }));
  } catch (e) {
    console.error('Jobicy error:', e);
    return [];
  }
}

export async function GET() {
  try {
    // Fetch from all sources in parallel with timeout
    const results = await Promise.allSettled([
      fetchRemoteOK(),
      fetchRemotive(),
      fetchArbeitnow(),
      fetchJobicy(),
    ]);

    const allJobs: Job[] = [];
    const sources: Record<string, number> = {
      remoteok: 0,
      remotive: 0,
      arbeitnow: 0,
      jobicy: 0,
    };

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const jobs = result.value;
        allJobs.push(...jobs);
        const sourceNames = ['remoteok', 'remotive', 'arbeitnow', 'jobicy'];
        sources[sourceNames[i]] = jobs.length;
      }
    });

    // Sort by recency
    allJobs.sort((a, b) => {
      if (!a.posted || !b.posted) return 0;
      return new Date(b.posted).getTime() - new Date(a.posted).getTime();
    });

    return NextResponse.json({
      jobs: allJobs,
      total: allJobs.length,
      sources,
    });
  } catch (e) {
    console.error('API error:', e);
    return NextResponse.json({
      jobs: [],
      total: 0,
      sources: { remoteok: 0, remotive: 0, arbeitnow: 0, jobicy: 0 },
      error: 'Failed to fetch jobs'
    });
  }
}
