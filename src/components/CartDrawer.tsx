import { useState } from 'react'
import { ArrowRight, Check, MapPin, Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { useAppState } from '../context/AppContext'
import LocationBar from './LocationBar'
import {
  DELIVERY_FEE,
  PAYMENT_LABELS,
  type PaymentMethod,
} from '../types'

interface CartDrawerProps {
  onClose: () => void
  onCheckout: (method: PaymentMethod) => void
}

const paymentGroups: { label: string; methods: PaymentMethod[] }[] = [
  { label: 'QRIS', methods: ['qris'] },
  { label: 'E-wallet', methods: ['gopay', 'dana', 'shopeepay'] },
  { label: 'M-banking', methods: ['bsi', 'bca', 'mandiri'] },
]

const money = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

export default function CartDrawer({ onClose, onCheckout }: CartDrawerProps) {
  const { state, setCartQuantity } = useAppState()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [error, setError] = useState('')
  const [editingLocation, setEditingLocation] = useState(false)
  const [confirmedLocation, setConfirmedLocation] = useState('')
  const locationKey = `${state.location.label}|${state.location.lat}|${state.location.lng}`
  const locationIsConfirmed = confirmedLocation === locationKey
  const items = state.cart.flatMap((line) => {
    const product = state.products.find((item) => item.id === line.productId)
    return product ? [{ product, quantity: line.quantity }] : []
  })
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const total = subtotal + (items.length ? DELIVERY_FEE : 0)

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-heading">
          <div className="drawer-title">
            <ShoppingBag size={21} aria-hidden="true" />
            <h2 id="cart-title">Keranjang</h2>
            <span>{items.length}</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup keranjang">
            <X size={20} />
          </button>
        </div>

        {items.length ? (
          <>
            <section className="cart-location" aria-labelledby="cart-location-title">
              <div className="cart-location-content">
                <MapPin size={19} aria-hidden="true" />
                <div>
                  <h3 id="cart-location-title">Alamat pengantaran</h3>
                  <strong>{state.location.label}</strong>
                  <small>
                    {state.location.lat.toFixed(5)}, {state.location.lng.toFixed(5)}
                  </small>
                </div>
                <button
                  className="cart-location-edit"
                  type="button"
                  aria-expanded={editingLocation}
                  onClick={() => setEditingLocation((open) => !open)}
                >
                  {editingLocation ? 'Selesai' : 'Ubah'}
                </button>
              </div>
              {editingLocation && <LocationBar />}
              <button
                className={`cart-location-confirm ${locationIsConfirmed ? 'cart-location-confirmed' : ''}`}
                type="button"
                aria-pressed={locationIsConfirmed}
                onClick={() => setConfirmedLocation(locationKey)}
              >
                {locationIsConfirmed ? <Check size={16} /> : <MapPin size={16} />}
                {locationIsConfirmed ? 'Lokasi pengantaran terkonfirmasi' : 'Konfirmasi lokasi ini'}
              </button>
            </section>
            <div className="cart-lines">
              {items.map(({ product, quantity }) => (
                <article className="cart-line" key={product.id}>
                  <img src={product.imageUrl} alt="" width="68" height="68" />
                  <div className="cart-line-info">
                    <strong>{product.name}</strong>
                    <span>{money(product.price)} / {product.unit}</span>
                    <div className="cart-quantity">
                      <button
                        className="quantity-button"
                        type="button"
                        aria-label={`Kurangi ${product.name}`}
                        onClick={() => setCartQuantity(product.id, quantity - 1)}
                      >
                        <Minus size={15} />
                      </button>
                      <span>{quantity} {product.unit}</span>
                      <button
                        className="quantity-button"
                        type="button"
                        aria-label={`Tambah ${product.name}`}
                        onClick={() => {
                          if (quantity >= product.stock) {
                            setError(`Stok ${product.name} hanya tersisa ${product.stock} ${product.unit}.`)
                            return
                          }
                          setError('')
                          setCartQuantity(product.id, quantity + 1)
                        }}
                        disabled={quantity >= product.stock}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                  <strong className="cart-line-total">
                    {money(product.price * quantity)}
                  </strong>
                </article>
              ))}
            </div>

            <div className="payment-choice">
              <h3>Pilih pembayaran</h3>
              {paymentGroups.map((group) => (
                <fieldset className="payment-group" key={group.label}>
                  <legend>{group.label}</legend>
                  <div className="payment-options">
                    {group.methods.map((method) => (
                      <label
                        className={`payment-option ${paymentMethod === method ? 'payment-option-selected' : ''}`}
                        key={method}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={() => setPaymentMethod(method)}
                        />
                        {PAYMENT_LABELS[method]}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="cart-summary">
              <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div><span>Ongkir</span><strong>{money(DELIVERY_FEE)}</strong></div>
              <div className="cart-total"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {!locationIsConfirmed && (
              <p className="cart-location-hint" role="status">
                Pastikan alamat pengantaran sebelum melanjutkan.
              </p>
            )}
            <button
              className="button button-primary cart-checkout"
              disabled={!locationIsConfirmed}
              type="button"
              onClick={() => {
                if (!state.vendorOnline) {
                  setError('Penjual sedang tidak aktif. Coba lagi saat layanan aktif.')
                  return
                }
                setError('')
                onCheckout(paymentMethod)
              }}
            >
              Lanjut pembayaran <ArrowRight size={17} aria-hidden="true" />
            </button>
          </>
        ) : (
          <div className="cart-empty">
            <ShoppingBag size={28} aria-hidden="true" />
            <strong>Keranjang masih kosong</strong>
            <p>Pilih ikan segar untuk mulai pesan.</p>
            <button className="button button-outline" type="button" onClick={onClose}>
              Lihat katalog
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
