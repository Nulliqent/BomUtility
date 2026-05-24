'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import UploadStagingArea from '../components/UploadStagingArea';
import ProductGrid from '../components/ProductGrid';
import MappingModal from '../components/MappingModal';
import ConfigJsonEditor from '../components/ConfigJsonEditor';

type ProductState = {
  checked: boolean;
  version: string;
  mappings: any[];
  showMappings: boolean;
};

export default function Page() {
  const [allProducts, setAllProducts] = useState<string[]>([]);
  const [detectedPackages, setDetectedPackages] = useState<string[]>([]);
  const [trackedState, setTrackedState] = useState<Record<string, ProductState>>({});
  
  const [currentFilter, setCurrentFilter] = useState<'all' | 'selected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [mappingModalSlug, setMappingModalSlug] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Pipeline execution
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [isPipelineComplete, setIsPipelineComplete] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Backend data fetch failed');
      const data = await res.json();
      
      const products = data.registry || [];
      const newTrackedState: Record<string, ProductState> = {};
      
      products.forEach((slug: string) => {
        newTrackedState[slug] = { checked: false, version: 'latest', mappings: [], showMappings: false };
      });

      let hasActive = false;
      if (data.config && data.config.tracked_products) {
        data.config.tracked_products.forEach((tp: any) => {
          if (tp.slug) {
            if (!newTrackedState[tp.slug]) products.push(tp.slug);
            newTrackedState[tp.slug] = {
              checked: true,
              version: tp.version || 'latest',
              mappings: tp.mappings || [],
              showMappings: false
            };
            hasActive = true;
          }
        });
      }

      setAllProducts(products);
      setTrackedState(newTrackedState);
      setDetectedPackages(data.packages || []);
      
      if (hasActive) {
        setCurrentFilter('selected');
      }
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend.');
      setIsLoading(false);
    }
  };

  const activeCount = useMemo(() => {
    return Object.values(trackedState).filter(s => s.checked).length;
  }, [trackedState]);

  const handleToggleProduct = (slug: string) => {
    setTrackedState(prev => ({
      ...prev,
      [slug]: { ...prev[slug], checked: !prev[slug].checked }
    }));
  };

  const handleVersionChange = (slug: string, version: string) => {
    setTrackedState(prev => ({
      ...prev,
      [slug]: { ...prev[slug], version }
    }));
  };

  const handleAddMapping = (slug: string, mapping: any) => {
    setTrackedState(prev => {
      const current = prev[slug].mappings;
      if (current.some(m => m.group === mapping.group && m.name === mapping.name)) return prev;
      return {
        ...prev,
        [slug]: { ...prev[slug], mappings: [...current, mapping] }
      };
    });
  };

  const handleRemoveMapping = (slug: string, index: number) => {
    setTrackedState(prev => {
      const current = [...prev[slug].mappings];
      current.splice(index, 1);
      return {
        ...prev,
        [slug]: { ...prev[slug], mappings: current }
      };
    });
  };

  const saveConfig = async () => {
    const tracked_products = Object.keys(trackedState)
      .filter(slug => trackedState[slug].checked)
      .map(slug => ({
        slug,
        version: trackedState[slug].version || 'latest',
        mappings: trackedState[slug].mappings
      }));

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracked_products })
      });
      if (!res.ok) throw new Error('Failed to save config');
      alert('✅ Configuration saved successfully to eol_config.json!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const saveRawConfig = async (newConfig: any) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (!res.ok) throw new Error('Failed to save config');
      setIsConfigModalOpen(false);
      // Reload everything to sync state
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const clearData = async () => {
    if (!confirm('Are you sure you want to clear all existing reports and BOM files?')) return;
    try {
      await fetch('/api/clear', { method: 'POST' });
      setDetectedPackages([]);
      alert('Reports and BOMs cleared.');
    } catch (err: any) {
      alert('Clear Failed: ' + err.message);
    }
  };

  const runPipeline = async () => {
    // First save the current UI state to config
    const tracked_products = Object.keys(trackedState)
      .filter(slug => trackedState[slug].checked)
      .map(slug => ({
        slug,
        version: trackedState[slug].version || 'latest',
        mappings: trackedState[slug].mappings
      }));

    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracked_products })
      });
    } catch (err: any) {
      alert('Failed to save config before running: ' + err.message);
      return;
    }

    setIsPipelineRunning(true);
    setIsPipelineComplete(false);
    setPipelineLogs('');
    
    try {
      const response = await fetch('/api/pipeline', { method: 'POST' });
      if (!response.body) throw new Error('No readable stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while(true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        setPipelineLogs(prev => prev + text);
      }
      setIsPipelineComplete(true);
    } catch (err: any) {
      setPipelineLogs(prev => prev + '\\n\\nERROR: ' + err.message);
      setIsPipelineComplete(true);
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: 'center', marginTop: '100px', fontSize: '1.5rem', color: 'var(--primary)' }}>Loading Configurator...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: '100px', color: 'var(--danger)' }}>{error}</div>;
  }

  const rawConfigObj = {
    tracked_products: Object.keys(trackedState).filter(slug => trackedState[slug].checked).map(slug => ({
      slug,
      version: trackedState[slug].version || 'latest',
      mappings: trackedState[slug].mappings
    }))
  };

  return (
    <>
      <Header 
        productCount={allProducts.length} 
        activeCount={activeCount} 
        bomsCount={detectedPackages.length} 
        onConfigClick={() => setIsConfigModalOpen(true)}
      />

      <main>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Configure Target Baseline</h2>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="theme-btn" onClick={clearData} style={{ background: 'var(--danger-glow)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>Clear Reports & BOMs</button>
            <button className="theme-btn" onClick={saveConfig} style={{ background: 'var(--info)', color: 'white' }}>💾 Save Config</button>
            <button className="theme-btn" onClick={runPipeline} disabled={detectedPackages.length === 0} style={{ background: 'var(--primary)', color: 'white', opacity: detectedPackages.length === 0 ? 0.5 : 1, cursor: detectedPackages.length === 0 ? 'not-allowed' : 'pointer' }}>🚀 Run Pipeline</button>
          </div>
        </div>

        <UploadStagingArea onUploadSuccess={(packages) => {
          setDetectedPackages(packages);
        }} />

        <div className="filter-panel">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search products by name or slug..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <button className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`} onClick={() => setCurrentFilter('all')}>
              🌐 All Products ({allProducts.length})
            </button>
            <button className={`filter-btn ${currentFilter === 'selected' ? 'active' : ''}`} onClick={() => setCurrentFilter('selected')}>
              ✅ Selected Baseline ({activeCount})
            </button>
          </div>
        </div>

        <ProductGrid 
          allProducts={allProducts}
          trackedState={trackedState}
          currentFilter={currentFilter}
          searchQuery={searchQuery}
          detectedPackages={detectedPackages}
          onToggleProduct={handleToggleProduct}
          onVersionChange={handleVersionChange}
          onOpenMappings={setMappingModalSlug}
        />
      </main>

      {mappingModalSlug && (
        <MappingModal 
          slug={mappingModalSlug}
          mappings={trackedState[mappingModalSlug].mappings}
          detectedPackages={detectedPackages}
          onClose={() => setMappingModalSlug(null)}
          onAddMapping={handleAddMapping}
          onRemoveMapping={handleRemoveMapping}
        />
      )}

      {isConfigModalOpen && (
        <ConfigJsonEditor 
          configObj={rawConfigObj}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={saveRawConfig}
        />
      )}

      {isPipelineRunning && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', width: '450px', height: '350px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>⚙️ Pipeline Logs</h2>
            <button onClick={() => setIsPipelineRunning(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center' }}>&times;</button>
          </div>
          <div style={{ flex: 1, background: '#0b0f19', color: '#10b981', fontFamily: 'monospace', fontSize: '0.85rem', padding: '12px', overflowY: 'auto', whiteSpace: 'pre-wrap', borderBottom: '1px solid var(--border-color)' }}>
            {pipelineLogs || 'Starting pipeline...'}
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {isPipelineComplete && (
              <button onClick={() => window.open('/reports/index.html', '_blank')} className="theme-btn" style={{ background: 'var(--primary)', color: 'white', fontWeight: 'bold', fontSize: '0.85rem', padding: '6px 12px' }}>
                📊 View Report
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
