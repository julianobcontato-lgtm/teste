import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, Issue } from '../types';
import { AlertCircle, Clock, CheckCircle2, MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  center?: Location;
  zoom?: number;
}

// Custom icon creator
const createCustomIcon = (status: string) => {
  const color = status === 'resolved' ? '#10b981' : 
                status === 'in-progress' ? '#f59e0b' : '#ef4444';
  
  const iconHtml = renderToStaticMarkup(
    <div style={{
      width: '32px',
      height: '32px',
      backgroundColor: color,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px solid white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
    }}>
      <MapPin size={18} color="white" />
    </div>
  );

  return L.divIcon({
    html: iconHtml,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

export default function MapView({ issues, onIssueClick, center = { lat: -23.5916, lng: -48.0531 }, zoom = 13 }: MapViewProps) {
  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
      <MapContainer 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {issues.map((issue) => (
          <Marker 
            key={issue.id} 
            position={[issue.location.lat, issue.location.lng]}
            icon={createCustomIcon(issue.status)}
            eventHandlers={{
              click: () => onIssueClick?.(issue),
            }}
          >
            <Popup className="modern-popup">
              <div className="p-1 min-w-[180px] font-sans">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    issue.status === 'resolved' ? 'bg-emerald-500' : 
                    issue.status === 'in-progress' ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <span className="font-bold text-sm text-gray-900">{issue.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-2 mb-3 leading-relaxed">{issue.description}</p>
                <div className="flex justify-between items-center text-[9px] font-black tracking-tighter text-gray-400 border-t border-gray-50 pt-2">
                  <span className="bg-gray-100 px-1.5 py-0.5 rounded uppercase">{issue.category}</span>
                  <span className="text-blue-600 hover:underline cursor-pointer">VER DETALHES →</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
