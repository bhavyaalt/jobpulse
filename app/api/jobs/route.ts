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
      headers: { 'User-Agent': 'JobPulse/1.0' },
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    return data.slice(1, 51).map((job: any) => ({
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

// Remotive - Free API
async function fetchRemotive(): Promise<Job[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=50', {
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
    
    return data.data.slice(0, 50).map((job: any) => ({
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
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50', {
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

  // Fetch from all sources in parallel
  const [remoteok, remotive, arbeitnow, jobicy] = await Promise.all([
    fetchRemoteOK(),
    fetchRemotive(),
    fetchArbeitnow(),
    fetchJobicy(),
  ]);

  let allJobs = [...remoteok, ...remotive, ...arbeitnow, ...jobicy];

  // Apply filters
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

  // Sort by recency (newest first based on source order)
  // Shuffle slightly to mix sources
  allJobs.sort(() => Math.random() - 0.5);

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
