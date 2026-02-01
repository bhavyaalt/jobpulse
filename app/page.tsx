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
  const [sources, setSources] = useState<JobsResponse['sources'] | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (location) params.set('location', location);
      if (source) params.set('source', source);
      
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
  }, []);

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
        <h1>⚡ JobPulse</h1>
        <p>Aggregating remote jobs from multiple sources</p>
      </header>

      {sources && (
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{jobs.length}</div>
            <div className="stat-label">Jobs Found</div>
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
          placeholder="Search jobs (e.g. React, Python, Designer)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input
          type="text"
          placeholder="Location (e.g. Remote, USA, Europe)"
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

      {loading ? (
        <div className="loading">Loading jobs from all sources...</div>
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
        <div className="loading">No jobs found. Try different filters.</div>
      )}
    </div>
  );
}
