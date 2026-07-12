import { useEffect, useState } from 'react';
import { activityApi } from '../api/client';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    Promise.all([
      activityApi.listLogs(),
      activityApi.listNotifications(),
    ])
      .then(([lgs, notifs]) => {
        setLogs(lgs);
        setNotifications(notifs);
      })
      .catch((err) => setError(err.body?.error || 'Could not load activity logs.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkAsRead = (id) => {
    activityApi.readNotification(id)
      .then(() => {
        setSuccess('Notification marked as read.');
        loadData();
      })
      .catch(err => setError(err.body?.error || 'Action failed.'));
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Activity Logs & Notifications</h1>
          <p>Read your alerts and view system audit trails of all operator actions.</p>
        </div>
      </div>

      {error && <div className="banner banner-danger mb-4">{error}</div>}
      {success && <div className="banner banner-success mb-4">{success}</div>}

      {loading ? (
        <p className="text-secondary">Loading history...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Column A: Notifications Inbox */}
          <div className="card card-padded" style={{ background: 'var(--bg-secondary)', height: 'fit-content' }}>
            <h3>Your Notifications</h3>
            <p className="text-secondary mb-4" style={{ fontSize: '12px' }}>Inbox of system notifications and allocation warnings.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {notifications.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '13px', fontStyle: 'italic' }}>Inbox is clean. No warnings.</p>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                      border: `1px solid ${notif.isRead ? 'var(--border-color)' : 'rgba(59, 130, 246, 0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1, marginRight: '12px' }}>
                      <p style={{ fontSize: '13px', color: notif.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleMarkAsRead(notif.id)}>
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column B: System Audit Logs */}
          <div className="card card-padded" style={{ background: 'var(--bg-secondary)' }}>
            <h3>System Audit Trail</h3>
            <p className="text-secondary mb-4" style={{ fontSize: '12px' }}>Operator actions logged chronologically for transparency.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '13px' }}>No audit logs recorded.</p>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--bg-tertiary)',
                      borderLeft: '4px solid var(--accent-color)',
                      fontSize: '13px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{log.action}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{log.details}</p>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Operator: {log.user.name} ({log.user.role.replace(/_/g, ' ')})
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
