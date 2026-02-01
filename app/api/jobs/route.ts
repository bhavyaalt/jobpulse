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
  category?: string;
}

// RemoteOK - Free public API (fetch more, filter client-side)
async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'DataJobs/1.0' },
      next: { revalidate: 300 }
    });
    const data = await res.json();
    
    return data.slice(1, 150).map((job: any) => ({
      id: `remoteok-${job.id}`,
      title: job.position || 'Unknown',
      company: job.company || 'Unknown',
      location: job.location || 'Remote',
      salary: job.salary_min && job.salary_max ? `$${job.salary_min}-${job.salary_max}` : undefined,
      url: job.url || `https://remoteok.com/l/${job.id}`,
      source: 'RemoteOK',
      posted: job.date,
      tags: job.tags || [],
      category: 'general',
    }));
  } catch (e) {
    console.error('RemoteOK error:', e);
    return [];
  }
}

// Remotive - Free API (multiple categories)
async function fetchRemotive(): Promise<Job[]> {
  try {
    // Fetch multiple categories
    const categories = ['data', 'software-dev', 'all-others'];
    const promises = categories.map(cat => 
      fetch(`https://remotive.com/api/remote-jobs?category=${cat}&limit=50`, {
        next: { revalidate: 300 }
      }).then(r => r.json()).catch(() => ({ jobs: [] }))
    );
    
    const results = await Promise.all(promises);
    const allJobs: Job[] = [];
    
    results.forEach((data, i) => {
      if (data.jobs) {
        data.jobs.forEach((job: any) => {
          allJobs.push({
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
            category: categories[i],
          });
        });
      }
    });
    
    return allJobs;
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
      category: 'general',
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
      category: typeof job.jobIndustry === 'string' ? job.jobIndustry.toLowerCase() : 'general',
    }));
  } catch (e) {
    console.error('Jobicy error:', e);
    return [];
  }
}

export async function GET() {
  // Fetch from all sources in parallel - NO FILTERING, send everything
  const [remoteok, remotive, arbeitnow, jobicy] = await Promise.all([
    fetchRemoteOK(),
    fetchRemotive(),
    fetchArbeitnow(),
    fetchJobicy(),
  ]);

  const allJobs = [...remoteok, ...remotive, ...arbeitnow, ...jobicy];

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
