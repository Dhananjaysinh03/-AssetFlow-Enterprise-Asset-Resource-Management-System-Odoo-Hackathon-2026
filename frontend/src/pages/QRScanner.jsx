import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { assetsApi } from '../api/client';
import StatusBadge from '../components/StatusBadge';

export default function QRScanner() {
  const [scannedTag, setScannedTag] = useState('');
  const [assetDetails, setAssetDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanActive, setScanActive] = useState(true);

  const handleScan = async (text) => {
    if (!text || text === scannedTag || loading) return;
    
    // Attempt to parse out an asset tag (e.g. AF-0001)
    let tagToSearch = text;
    const afMatch = text.match(/AF-\d{4}/);
    if (afMatch) {
      tagToSearch = afMatch[0];
    }

    setScannedTag(tagToSearch);
    setLoading(true);
    setError('');
    setScanActive(false); // Pause scanning while fetching

    try {
      const results = await assetsApi.list({ search: tagToSearch });
      
      // Look for an exact match on assetTag
      const match = results.find(a => a.assetTag === tagToSearch || a.tag === tagToSearch);
      
      if (match) {
        // Fetch full details
        const fullDetails = await assetsApi.get(match.id);
        setAssetDetails(fullDetails);
      } else {
        setError(`No asset found matching tag: ${tagToSearch}`);
      }
    } catch (err) {
      setError(err?.body?.error || err.message || 'Failed to lookup asset');
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setScannedTag('');
    setAssetDetails(null);
    setError('');
    setScanActive(true);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>QR Scanner</h1>
          <p>Scan an asset QR code to view its details instantly.</p>
        </div>
        {!scanActive && (
          <button className="btn btn-outline" onClick={resetScan}>
            Scan Another Asset
          </button>
        )}
      </div>

      <div className="flex gap-6 mt-4" style={{ flexWrap: 'wrap' }}>
        {/* Scanner Column */}
        <div className="card card-padded" style={{ flex: '1 1 400px', minWidth: '300px' }}>
          <h3 className="mb-4">Scan QR Code</h3>
          {scanActive ? (
            <div style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
               <Scanner
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      handleScan(result[0].rawValue);
                    }
                  }}
                  onError={(err) => console.error(err)}
                  formats={['qr_code']}
               />
            </div>
          ) : (
            <div className="empty-state">
              <h3>Scan Paused</h3>
              <p>Viewing details for {scannedTag}</p>
            </div>
          )}
          {error && <div className="banner banner-danger mt-4">{error}</div>}
        </div>

        {/* Results Column */}
        <div style={{ flex: '1 1 400px' }}>
          {loading ? (
            <div className="card card-padded empty-state">
              <h3>Loading asset details...</h3>
            </div>
          ) : assetDetails ? (
            <div className="card card-padded">
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ margin: 0 }}>{assetDetails.name}</h3>
                <StatusBadge status={assetDetails.status} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>ASSET TAG</div>
                  <div className="cell-mono font-medium">{assetDetails.assetTag}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>CATEGORY</div>
                  <div className="font-medium">{assetDetails.category?.name}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>SERIAL NUMBER</div>
                  <div className="font-medium">{assetDetails.serialNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '12px' }}>LOCATION</div>
                  <div className="font-medium">{assetDetails.location || '—'}</div>
                </div>
              </div>

              {/* Current Allocation Section */}
              <h4 className="mb-2 border-t pt-4">Current Status</h4>
              {assetDetails.status === 'Available' ? (
                <div className="banner banner-success">This asset is available for allocation or booking.</div>
              ) : assetDetails.status === 'Allocated' ? (
                (() => {
                  const activeAlloc = assetDetails.allocations?.find(a => a.isActive);
                  return activeAlloc ? (
                    <div style={{ padding: '12px', background: 'var(--surface-50)', borderRadius: '6px' }}>
                      <div className="font-medium text-primary">Currently allocated to:</div>
                      <div className="flex gap-2 items-center mt-1">
                        <div className="avatar-small">{activeAlloc.user?.name?.[0] || activeAlloc.department?.name?.[0]}</div>
                        <div>
                          <div>{activeAlloc.user?.name || activeAlloc.department?.name}</div>
                          {activeAlloc.expectedReturnDate && (
                            <div className="text-secondary" style={{ fontSize: '12px' }}>
                              Due: {new Date(activeAlloc.expectedReturnDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : <div className="text-secondary">Allocation details missing</div>;
                })()
              ) : assetDetails.status === 'Under_Maintenance' ? (
                <div className="banner banner-warning">This asset is currently under maintenance.</div>
              ) : (
                <div className="text-secondary">Status: {assetDetails.status.replace(/_/g, ' ')}</div>
              )}
            </div>
          ) : (
             <div className="card card-padded empty-state">
              <h3>Waiting for scan...</h3>
              <p>Point your camera at an AssetFlow QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
