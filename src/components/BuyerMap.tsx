import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Navigation, Store, X } from 'lucide-react'
import { useAppState } from '../context/AppContext'
import { VENDOR_LOCATION, type FishOrder } from '../types'

interface BuyerMapProps {
  onSelectVendor: () => void
  showVendorDetail: boolean
  onCloseVendor: () => void
  vendorDistance: string
}

function makeMarker(className: string, label: string) {
  return L.divIcon({
    className: 'map-marker-shell',
    html: `<span class="map-marker ${className}">${label}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

const vendorIcon = makeMarker('map-marker-vendor', 'I')
const buyerIcon = makeMarker('map-marker-buyer', 'K')
const riderIcon = makeMarker('map-marker-rider', 'GO')

function RecenterMap({ target }: { target: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.7 })
  }, [map, target])
  return null
}

function interpolateOrder(order: FishOrder): [number, number] {
  const progress = order.progress / 100
  return [
    VENDOR_LOCATION.lat + (order.location.lat - VENDOR_LOCATION.lat) * progress,
    VENDOR_LOCATION.lng + (order.location.lng - VENDOR_LOCATION.lng) * progress,
  ]
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds} dtk`
  return `${Math.ceil(seconds / 60)} mnt`
}

export default function BuyerMap({
  onSelectVendor,
  showVendorDetail,
  onCloseVendor,
  vendorDistance,
}: BuyerMapProps) {
  const { state } = useAppState()
  const activeOrder = state.orders.find((order) => order.status === 'en_route')
  const target = useMemo<[number, number]>(
    () => [state.location.lat, state.location.lng],
    [state.location.lat, state.location.lng],
  )
  const route: [number, number][] = activeOrder
    ? [
        [VENDOR_LOCATION.lat, VENDOR_LOCATION.lng],
        [activeOrder.location.lat, activeOrder.location.lng],
      ]
    : []
  const riderPosition = activeOrder ? interpolateOrder(activeOrder) : null

  return (
    <section className="map-panel" aria-label="Peta penjual ikan sekitar">
      <MapContainer
        center={target}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
        className="buyer-map"
      >
        <RecenterMap target={target} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {state.vendorOnline && (
          <Marker
            position={[VENDOR_LOCATION.lat, VENDOR_LOCATION.lng]}
            icon={vendorIcon}
            title="Lokasi penjual di Peunayong"
            eventHandlers={{ click: onSelectVendor }}
          />
        )}
        <Marker position={target} icon={buyerIcon} title={state.location.label} />
        {activeOrder && riderPosition && (
          <>
            <Polyline
              positions={route}
              pathOptions={{ color: 'var(--accent)', weight: 3, dashArray: '7 8' }}
            />
            <Marker
              position={riderPosition}
              icon={riderIcon}
              title={`Penjual menuju lokasi. Tiba dalam ${formatEta(activeOrder.etaSeconds)}.`}
            />
          </>
        )}
      </MapContainer>
      <div className="map-caption">
        <div className="map-live">
          <span className="map-live-mark" aria-hidden="true" />
          {state.vendorOnline ? 'Penjual aktif melayani' : 'Penjual sedang tidak aktif'}
        </div>
        <span className="map-credit">Peta © OpenStreetMap</span>
      </div>
      {activeOrder && (
        <div className="trip-banner" role="status">
          <Navigation size={18} aria-hidden="true" />
          <div>
            <strong>Pengantar menuju lokasi Anda</strong>
            <span>Perkiraan tiba {formatEta(activeOrder.etaSeconds)}</span>
          </div>
          <span className="trip-progress">{Math.round(activeOrder.progress)}%</span>
        </div>
      )}
      <button className="map-vendor-chip" type="button" onClick={onSelectVendor}>
        <Store size={17} aria-hidden="true" />
        {state.vendorOnline ? 'Lihat profil penjual' : 'Penjual tidak aktif'}
      </button>
      {showVendorDetail && (
        <aside className="vendor-map-sheet">
          <button
            className="icon-button vendor-sheet-close"
            type="button"
            onClick={onCloseVendor}
            aria-label="Tutup info penjual"
          >
            <X size={18} />
          </button>
          <span className="vendor-sheet-mark"><Store size={18} aria-hidden="true" /></span>
          <div className="vendor-sheet-profile">
            <span className="vendor-sheet-type">Penjual ikan</span>
            <strong>Penjual Peunayong</strong>
            <span>{state.vendorOnline ? 'Aktif melayani' : 'Sedang tidak aktif'}</span>
          </div>
          <div className="vendor-sheet-distance">
            {state.products.length} jenis ikan
            <span>{vendorDistance} km dari lokasimu</span>
          </div>
          <ul className="vendor-sheet-inventory">
            {state.products.map((product) => (
              <li key={product.id}>
                <span>{product.name}</span>
                <strong>
                  {product.stock ? `Tersedia ${product.stock} ${product.unit}` : 'Stok habis'}
                </strong>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </section>
  )
}
