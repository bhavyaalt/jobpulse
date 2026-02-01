'use client';

import { useState, useEffect, useMemo } from 'react';

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

interface JobsResponse {
  jobs: Job[];
  total: number;
  sources: Record<string, number>;
}

// Data-related keywords
const DATA_KEYWORDS = [
  'data', 'analyst', 'analytics', 'scientist', 'science',
  'sql', 'python', 'tableau', 'power bi', 'excel', 'statistics',
  'machine learning', 'ml', 'ai', 'database', 'etl', 'bi',
  'business intelligence', 'visualization', 'reporting', 'insights',
  'engineer', 'warehouse', 'pipeline', 'spark', 'hadoop'
];

// Senior indicators
const SENIOR_KEYWORDS = [
  'senior', 'sr.', 'sr ', 'lead', 'principal', 'staff', 'manager',
  'director', 'head of', 'vp', 'chief', 'architect'
];

export default function Home() {
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  const [dataOnly, setDataOnly] = useState(true);
  const [entryOnly, setEntryOnly] = useState(true);
  const [totalFetched, setTotalFetched] = useState(0);

  // Fetch ALL jobs once on mount
  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/jobs');
        const data: JobsResponse = await res.json();
        setAllJobs(data.jobs);
        setTotalFetched(data.total);
      } catch (e) {
        console.error('Failed to fetch jobs:', e);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  // Filter jobs client-side (instant, no API calls)
  const filteredJobs = useMemo(() => {
    let jobs = [...allJobs];

    // Data roles filter
    if (dataOnly) {
      jobs = jobs.filter(job => {
        const text = `${job.title} ${job.tags?.join(' ') || ''}`.toLowerCase();
        return DATA_KEYWORDS.some(kw => text.includes(kw));
      });
    }

    // Entry level filter (exclude senior)
    if (entryOnly) {
      jobs = jobs.filter(job => {
        const titleLower = job.title.toLowerCase();
        return !SENIOR_KEYWORDS.some(kw => titleLower.includes(kw));
      });
    }

    // Search query
    if (query.trim()) {
      const q = query.toLowerCase();
      jobs = jobs.filter(job =>
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        job.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    // Location filter
    if (location.trim()) {
      const loc = location.toLowerCase();
      jobs = jobs.filter(job =>
        job.location.toLowerCase().includes(loc)
      );
    }

    // Source filter
    if (source) {
      jobs = jobs.filter(job => job.source === source);
    }

    return jobs;
  }, [allJobs, query, location, source, dataOnly, entryOnly]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📊 DataJobs</h1>
        <p>Entry-level data roles • Remote-first • Updated daily</p>
      </header>

      <div className="stats">
        <div className="stat">
          <div className="stat-number">{filteredJobs.length}</div>
          <div className="stat-label">Matching</div>
        </div>
        <div className="stat">
          <div className="stat-number">{totalFetched}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search (SQL, Python, Tableau...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location (USA, Europe...)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All Sources</option>
          <option value="RemoteOK">RemoteOK</option>
          <option value="Remotive">Remotive</option>
          <option value="Arbeitnow">Arbeitnow</option>
          <option value="Jobicy">Jobicy</option>
        </select>
      </div>

      <div className="toggle-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={dataOnly}
            onChange={(e) => setDataOnly(e.target.checked)}
          />
          <span>Data roles only</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={entryOnly}
            onChange={(e) => setEntryOnly(e.target.checked)}
          />
          <span>Entry level (no Senior/Lead)</span>
        </label>
      </div>

      {loading ? (
        <div className="loading">Loading jobs from 4 sources...</div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.slice(0, 100).map((job) => (
            <div key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <div className="company">{job.company}</div>
              <div className="meta">
                <span>📍 {job.location}</span>
                {job.salary && <span>💰 {job.salary}</span>}
                {job.posted && <span>🕐 {formatDate(job.posted)}</span>}
              </div>
              {job.tags && job.tags.length > 0 && (
                <div className="tags">
                  {job.tags.slice(0, 4).map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="card-footer">
                <span className="source">{job.source}</span>
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  Apply →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredJobs.length === 0 && (
        <div className="no-results">
          <p>No jobs match your filters.</p>
          <p>Try unchecking "Data roles only" or "Entry level"</p>
        </div>
      )}

      {!loading && filteredJobs.length > 100 && (
        <div className="more-info">Showing first 100 of {filteredJobs.length} jobs</div>
      )}

      <footer className="footer">
        <p>Built with ⚡ by <a href="https://shippedbyai.com" target="_blank">shippedbyai.com</a></p>
      </footer>
    </div>
  );
}
