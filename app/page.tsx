'use client';

import { useState, useEffect } from 'react';

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
  sources: {
    remoteok: number;
    remotive: number;
    arbeitnow: number;
    jobicy: number;
  };
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  const [entryOnly, setEntryOnly] = useState(true);
  const [sources, setSources] = useState<JobsResponse['sources'] | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (location) params.set('location', location);
      if (source) params.set('source', source);
      if (!entryOnly) params.set('entry', 'false');
      
      const res = await fetch(`/api/jobs?${params}`);
      const data: JobsResponse = await res.json();
      setJobs(data.jobs);
      setSources(data.sources);
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [entryOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  return (
    <div className="container">
      <header className="header">
        <h1>📊 DataJobs</h1>
        <p>Entry-level data roles • Remote-first • Updated daily</p>
        <div className="subtitle">Data Analyst • Data Scientist • Analytics • BI • SQL</div>
      </header>

      {sources && (
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{jobs.length}</div>
            <div className="stat-label">Data Jobs</div>
          </div>
          <div className="stat">
            <div className="stat-number">4</div>
            <div className="stat-label">Sources</div>
          </div>
        </div>
      )}

      <form className="filters" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search (e.g. SQL, Python, Tableau)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location (e.g. USA, Europe)"
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
        <button type="submit">Search</button>
      </form>

      <div className="toggle-row">
        <label className="toggle">
          <input
            type="checkbox"
            checked={entryOnly}
            onChange={(e) => setEntryOnly(e.target.checked)}
          />
          <span>Entry Level Only (exclude Senior/Lead roles)</span>
        </label>
      </div>

      {loading ? (
        <div className="loading">Finding entry-level data jobs...</div>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <div className="company">{job.company}</div>
              <div className="meta">
                <span>📍 {job.location}</span>
                {job.type && <span>💼 {job.type}</span>}
                {job.salary && <span>💰 {job.salary}</span>}
                {job.posted && <span>🕐 {formatDate(job.posted)}</span>}
              </div>
              {job.tags && job.tags.length > 0 && (
                <div className="tags">
                  {job.tags.slice(0, 5).map((tag, i) => (
                    <span key={i} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="source">Source: {job.source}</div>
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                Apply →
              </a>
            </div>
          ))}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="no-results">
          <p>No entry-level data jobs found with those filters.</p>
          <p>Try removing filters or uncheck "Entry Level Only".</p>
        </div>
      )}

      <footer className="footer">
        <p>Built with ⚡ by <a href="https://shippedbyai.com" target="_blank">shippedbyai.com</a></p>
      </footer>
    </div>
  );
}
