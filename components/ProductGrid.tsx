'use client';
import React, { useMemo } from 'react';

type ProductState = {
  checked: boolean;
  version: string;
  mappings: any[];
  showMappings: boolean;
};

export default function ProductGrid({
  allProducts,
  trackedState,
  currentFilter,
  searchQuery,
  detectedPackages,
  onToggleProduct,
  onVersionChange,
  onOpenMappings
}: {
  allProducts: string[];
  trackedState: Record<string, ProductState>;
  currentFilter: 'all' | 'selected';
  searchQuery: string;
  detectedPackages: string[];
  onToggleProduct: (slug: string) => void;
  onVersionChange: (slug: string, version: string) => void;
  onOpenMappings: (slug: string) => void;
}) {

  const visibleProducts = useMemo(() => {
    return allProducts.filter(slug => {
      const state = trackedState[slug];
      if (!state) return false;
      if (currentFilter === 'selected' && !state.checked) return false;
      return slug.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allProducts, trackedState, currentFilter, searchQuery]);

  return (
    <div className="products-grid">
      {visibleProducts.map(slug => {
        const state = trackedState[slug];
        const isSelected = state.checked;

        return (
          <div key={slug} className={`product-item ${isSelected ? 'selected' : ''}`}>
            <div 
              className="product-card" 
              onClick={(e) => {
                // Prevent toggling if clicking input or button
                if ((e.target as HTMLElement).closest('.version-input') || (e.target as HTMLElement).closest('.btn-toggle-mappings')) {
                  return;
                }
                onToggleProduct(slug);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="checkbox" style={{
                width: '20px', height: '20px', border: '2px solid var(--border-color)', 
                borderRadius: '4px', background: isSelected ? 'var(--primary)' : 'transparent',
                display: 'inline-block', position: 'absolute', top: '24px', right: '24px'
              }}>
                {isSelected && <span style={{ color: 'white', display: 'block', textAlign: 'center', lineHeight: '16px', fontSize: '14px' }}>✓</span>}
              </div>
              
              <div className="product-info" style={{ paddingRight: '30px' }}>
                <div className="product-name" style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '8px' }}>{slug}</div>
                <input 
                  type="text" 
                  className="version-input" 
                  value={state.version} 
                  onChange={(e) => onVersionChange(slug, e.target.value)}
                  placeholder="Target version (e.g. latest, 17)"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
                />
              </div>
              
              <button 
                className="btn-toggle-mappings" 
                onClick={(e) => { e.stopPropagation(); onOpenMappings(slug); }}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '8px', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}
              >
                ⚙️ Map Packages ({state.mappings.length})
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
