import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Fish,
  LogOut,
  MapPin,
  ShoppingBasket,
  Store,
} from 'lucide-react'
import BuyerMap from './components/BuyerMap'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'
import LocationBar from './components/LocationBar'
import VendorDashboard from './components/VendorDashboard'
import { useAppState } from './context/AppContext'
import {
  DELIVERY_FEE,
  VENDOR_LOCATION,
  type FishProduct,
  type PaymentMethod,
  type Role,
} from './types'

const money = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

const SESSION_KEY = 'ikan-go-session-v1'

function readSession(): Role | null {
  const saved = window.localStorage.getItem(SESSION_KEY)
  return saved === 'buyer' || saved === 'vendor' ? saved : null
}

function LoginScreen({ onLogin }: { onLogin: (role: Role) => void }) {
  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <span className="login-mark"><Fish size={27} aria-hidden="true" /></span>
        <span className="login-eyebrow">Login IKAN GO</span>
        <h1 id="login-title">Selamat datang di IKAN GO</h1>
        <p>Pilih peran untuk melanjutkan ke layanan pengantaran ikan segar Banda Aceh.</p>
        <div className="login-roles">
          <button className="login-role" type="button" onClick={() => onLogin('buyer')}>
            <ShoppingBasket size={23} aria-hidden="true" />
            <strong>Pembeli</strong>
            <span>Pesan ikan segar dan pantau pengantaran hingga tujuan.</span>
            <span className="login-role-action">Masuk sebagai Pembeli <ArrowRight size={15} aria-hidden="true" /></span>
          </button>
          <button className="login-role" type="button" onClick={() => onLogin('vendor')}>
            <Store size={23} aria-hidden="true" />
            <strong>Penjual</strong>
            <span>Kelola katalog, stok, dan pesanan yang masuk.</span>
            <span className="login-role-action">Masuk sebagai Penjual <ArrowRight size={15} aria-hidden="true" /></span>
          </button>
        </div>
      </section>
    </main>
  )
}

function distanceInKm(a: [number, number], b: [number, number]): number {
  const radians = (degree: number) => (degree * Math.PI) / 180
  const [lat1, lon1] = a.map(radians)
  const [lat2, lon2] = b.map(radians)
  const latDistance = lat2 - lat1
  const lonDistance = lon2 - lon1
  const distance =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDistance / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance))
}

function FishRow({
  product,
  quantity,
  onAdd,
}: {
  product: FishProduct
  quantity: number
  onAdd: () => void
}) {
  const unavailable = product.stock <= 0
  const full = quantity >= product.stock

  return (
    <article className={`fish-row ${unavailable ? 'fish-row-sold' : ''}`}>
      <img
        className="fish-photo"
        src={product.imageUrl}
        alt=""
        width="104"
        height="96"
        onError={(event) => {
          event.currentTarget.classList.add('image-unavailable')
        }}
      />
      <div className="fish-copy">
        <h3>{product.name}</h3>
        <strong>{money(product.price)} <span>/ {product.unit}</span></strong>
        <span className={unavailable ? 'fish-stock fish-stock-empty' : 'fish-stock'}>
          {unavailable ? 'Stok habis' : `Tersedia ${product.stock} ${product.unit}`}
        </span>
      </div>
      <button
        className={`add-fish ${quantity ? 'add-fish-selected' : ''}`}
        type="button"
        disabled={unavailable || full}
        onClick={onAdd}
      >
        {unavailable ? 'Stok habis' : quantity ? `Tambah (${quantity})` : 'Tambah'}
      </button>
    </article>
  )
}

function RecentOrder() {
  const { state } = useAppState()
  const order = state.orders[0]
  if (!order) return null
  const arrived = order.status === 'delivered'
  const eta =
    order.etaSeconds < 60
      ? `${order.etaSeconds} detik`
      : `${Math.ceil(order.etaSeconds / 60)} menit`

  return (
    <section className={`recent-order ${arrived ? 'recent-order-arrived' : ''}`} role="status">
      <span className="recent-order-icon"><Fish size={19} aria-hidden="true" /></span>
      <div>
        <strong>{arrived ? 'Pesanan selesai' : 'Pengantar menuju lokasi Anda'}</strong>
        <span>
          {arrived
            ? `Pesanan di ${order.location.label} telah tiba.`
            : `Perkiraan tiba dalam ${eta} di ${order.location.label}.`}
        </span>
      </div>
      <span className="recent-order-progress">{arrived ? 'Tiba' : `${Math.round(order.progress)}%`}</span>
    </section>
  )
}

function BuyerDashboard({
  onOpenCart,
  onSelectVendor,
  showVendorDetail,
  onCloseVendor,
}: {
  onOpenCart: () => void
  onSelectVendor: () => void
  showVendorDetail: boolean
  onCloseVendor: () => void
}) {
  const { state, setCartQuantity } = useAppState()
  const cartCount = state.cart.reduce((sum, line) => sum + line.quantity, 0)
  const vendorDistance = distanceInKm(
    [state.location.lat, state.location.lng],
    [VENDOR_LOCATION.lat, VENDOR_LOCATION.lng],
  ).toFixed(1)

  return (
    <>
      <main className="buyer-layout">
        <section className="buyer-map-column">
          <div className="buyer-intro">
            <div>
              <h1>Ikan segar, pengantaran teratur.</h1>
              <p>Pilih produk dan tentukan titik pengantaran.</p>
            </div>
            <span className="service-area"><MapPin size={15} /> Banda Aceh</span>
          </div>
          <BuyerMap
            onSelectVendor={onSelectVendor}
            showVendorDetail={showVendorDetail}
            onCloseVendor={onCloseVendor}
            vendorDistance={vendorDistance}
          />
          <RecentOrder />
        </section>

        <section className="catalog-panel">
          <div className="catalog-heading">
            <div>
              <span className="catalog-location"><MapPin size={14} /> {state.location.label}</span>
              <h2>Katalog produk</h2>
            </div>
            <button className="cart-button" type="button" onClick={onOpenCart}>
              <ShoppingBasket size={19} aria-hidden="true" />
              Keranjang
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
          </div>
          {state.vendorOnline ? (
            <div className="fish-list">
              {state.products.map((product) => {
                const quantity =
                  state.cart.find((line) => line.productId === product.id)?.quantity ?? 0
                return (
                  <FishRow
                    key={product.id}
                    product={product}
                    quantity={quantity}
                    onAdd={() => setCartQuantity(product.id, quantity + 1)}
                  />
                )
              })}
            </div>
          ) : (
            <div className="catalog-offline">
              <Store size={26} aria-hidden="true" />
              <strong>Penjual sedang tidak aktif</strong>
              <p>Produk tersedia kembali saat penjual mengaktifkan layanan.</p>
            </div>
          )}
          <div className="delivery-note">
            <span>Pengantaran ke {state.location.label}</span>
            <strong>{money(DELIVERY_FEE)}</strong>
          </div>
        </section>
      </main>
      <footer className="app-footer">
        <span>IKAN GO</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          Peta OpenStreetMap <ArrowUpRight size={14} />
        </a>
      </footer>
    </>
  )
}

export default function App() {
  const { state, storageError, setRole, placeOrder } = useAppState()
  const [session, setSession] = useState<Role | null>(readSession)
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod | null>(null)
  const [vendorDetailOpen, setVendorDetailOpen] = useState(false)
  const cartCount = state.cart.reduce((sum, line) => sum + line.quantity, 0)

  const loginAs = (role: Role) => {
    setRole(role)
    window.localStorage.setItem(SESSION_KEY, role)
    setSession(role)
  }

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY)
    setCartOpen(false)
    setCheckoutMethod(null)
    setVendorDetailOpen(false)
    setSession(null)
  }

  if (!session) return <LoginScreen onLogin={loginAs} />

  const confirmPayment = () => {
    if (!checkoutMethod) return 'Pilih metode pembayaran terlebih dahulu.'
    const result = placeOrder(checkoutMethod)
    if (result.error) return result.error
    setCheckoutMethod(null)
    setCartOpen(false)
    return null
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="IKAN GO beranda">
          <span className="brand-mark"><Fish size={21} aria-hidden="true" /></span>
          <span className="wordmark">IKAN GO</span>
        </a>
        <span className="topbar-caption">Layanan pengantaran ikan</span>
        <div className="topbar-account">
          <span className="account-role">
            {session === 'buyer' ? <ShoppingBasket size={15} aria-hidden="true" /> : <Store size={15} aria-hidden="true" />}
            {session === 'buyer' ? 'Pembeli' : 'Penjual'}
          </span>
          <button className="button button-text logout-button" type="button" onClick={logout}>
            <LogOut size={15} aria-hidden="true" />
            Keluar
          </button>
        </div>
      </header>

      {session === 'buyer' && !cartOpen && !checkoutMethod && (
        <section className="location-wrap" aria-label="Lokasi pengantaran">
          <LocationBar />
        </section>
      )}

      {storageError && (
        <p className="storage-warning" role="alert">{storageError}</p>
      )}

      {session === 'buyer' ? (
        <BuyerDashboard
          onOpenCart={() => setCartOpen(true)}
          onSelectVendor={() => setVendorDetailOpen(true)}
          showVendorDetail={vendorDetailOpen}
          onCloseVendor={() => setVendorDetailOpen(false)}
        />
      ) : (
        <VendorDashboard />
      )}

      {cartOpen && (
        <CartDrawer
          onClose={() => setCartOpen(false)}
          onCheckout={(method) => {
            setCartOpen(false)
            setCheckoutMethod(method)
          }}
        />
      )}
      {checkoutMethod && (
        <CheckoutModal
          paymentMethod={checkoutMethod}
          onClose={() => setCheckoutMethod(null)}
          onConfirm={confirmPayment}
        />
      )}
      {session === 'buyer' && cartCount > 0 && !cartOpen && !checkoutMethod && (
        <button className="floating-cart" type="button" onClick={() => setCartOpen(true)}>
          <ShoppingBasket size={19} aria-hidden="true" />
          <span>{cartCount} item di keranjang</span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
