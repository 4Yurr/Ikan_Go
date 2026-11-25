import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  MapPin,
  Minus,
  PackagePlus,
  Plus,
  Store,
} from 'lucide-react'
import { useAppState } from '../context/AppContext'
import { fileAsDataUrl, hasImageStorage, uploadFishImage } from '../lib/supabase'
import {
  PAYMENT_LABELS,
  VENDOR_LOCATION,
  type FishOrder,
  type FishProduct,
} from '../types'

const money = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)

function ProductEditor({
  editing,
  onCancel,
}: {
  editing: FishProduct | null
  onCancel: () => void
}) {
  const { saveProduct } = useAppState()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState(editing?.imageUrl ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const previewObjectUrl = useRef('')

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current)
    }
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const price = Number(form.get('price'))
    const stock = Number(form.get('stock'))
    const unit = String(form.get('unit'))
    if (
      !name ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(stock) ||
      stock < 0 ||
      (unit !== 'kg' && unit !== 'ekor')
    ) {
      setError('Lengkapi nama produk, harga, dan stok dengan benar.')
      return
    }
    const maxImageBytes = hasImageStorage ? 5 * 1024 * 1024 : 1024 * 1024
    if (file && (!file.type.startsWith('image/') || file.size > maxImageBytes)) {
      setError(
        hasImageStorage
          ? 'Pilih foto berformat gambar dengan ukuran maksimal 5 MB.'
          : 'Pilih foto berformat gambar dengan ukuran maksimal 1 MB untuk penyimpanan lokal.',
      )
      return
    }

    setSaving(true)
    try {
      const formElement = event.currentTarget
      const imageUrl = file
        ? hasImageStorage
          ? await uploadFishImage(file)
          : await fileAsDataUrl(file)
        : editing?.imageUrl ??
          'https://placehold.co/800x600/e8edf0/1d3440?text=Ikan+Segar'
      saveProduct({
        id: editing?.id ?? crypto.randomUUID(),
        name,
        price: Math.round(price),
        stock: Math.floor(stock),
        unit,
        imageUrl,
      })
      if (!editing) {
        formElement.reset()
        if (previewObjectUrl.current) {
          URL.revokeObjectURL(previewObjectUrl.current)
          previewObjectUrl.current = ''
        }
        setPreviewUrl('')
      }
      setFile(null)
      onCancel()
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Produk tidak dapat disimpan. Coba lagi.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="product-editor" onSubmit={submit}>
      <div className="editor-title">
        <PackagePlus size={19} aria-hidden="true" />
        <h3>{editing ? 'Ubah produk' : 'Tambah produk'}</h3>
      </div>
      <label className="field">
        <span>Nama produk</span>
        <input
          key={editing?.id ?? 'new'}
          name="name"
          defaultValue={editing?.name ?? ''}
          placeholder="Contoh: Ikan Kembung"
          required
        />
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Harga satuan (Rp)</span>
          <input
            key={`price-${editing?.id ?? 'new'}`}
            name="price"
            type="number"
            min="500"
            step="500"
            defaultValue={editing?.price ?? ''}
            placeholder="35000"
            required
          />
        </label>
        <label className="field">
          <span>Stok</span>
          <input
            key={`stock-${editing?.id ?? 'new'}`}
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue={editing?.stock ?? ''}
            placeholder="8"
            required
          />
        </label>
      </div>
      <label className="field">
        <span>Satuan stok</span>
        <select name="unit" defaultValue={editing?.unit ?? 'kg'}>
          <option value="kg">Kilogram (kg)</option>
          <option value="ekor">Ekor</option>
        </select>
      </label>
      <label className="upload-field">
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            if (previewObjectUrl.current) {
              URL.revokeObjectURL(previewObjectUrl.current)
              previewObjectUrl.current = ''
            }
            const nextFile = event.target.files?.[0] ?? null
            setFile(nextFile)
            if (nextFile) {
              previewObjectUrl.current = URL.createObjectURL(nextFile)
              setPreviewUrl(previewObjectUrl.current)
            } else {
              setPreviewUrl(editing?.imageUrl ?? '')
            }
          }}
        />
        {previewUrl ? (
          <img src={previewUrl} alt="Pratinjau foto produk" />
        ) : (
          <span className="upload-empty">
            <ImagePlus size={21} aria-hidden="true" />
            Unggah foto produk
          </span>
        )}
        <span className="upload-caption">
          {hasImageStorage ? 'Foto disimpan di Supabase Storage' : 'Foto disimpan di perangkat ini'}
        </span>
      </label>
      {!hasImageStorage && (
        <p className="storage-note">
          Penyimpanan foto belum dikonfigurasi. Foto disimpan sementara di perangkat ini.
        </p>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="editor-actions">
        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Tambah ke katalog'}
        </button>
        {editing && (
          <button className="button button-text" type="button" onClick={onCancel}>
            Batal
          </button>
        )}
      </div>
    </form>
  )
}

function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: FishOrder
  expanded: boolean
  onToggle: () => void
}) {
  const arrived = order.status === 'delivered'
  const eta = order.etaSeconds < 60 ? `${order.etaSeconds} dtk` : `${Math.ceil(order.etaSeconds / 60)} mnt`

  return (
    <article className="order-row">
      <div className="order-topline">
        <div>
          <span className={arrived ? 'order-status status-done' : 'order-status'}>
            {arrived ? <Check size={14} /> : <span className="status-live" />}
            {arrived ? 'Pesanan selesai' : 'Dalam pengantaran'}
          </span>
          <strong className="order-destination">
            <MapPin size={15} aria-hidden="true" />
            {order.location.label}
          </strong>
        </div>
          <span className="payment-badge">Lunas · {PAYMENT_LABELS[order.paymentMethod]}</span>

      </div>
      <p className="order-items">
        {order.items.map((item) => `${item.quantity} kg ${item.name}`).join(', ')}
      </p>
      {expanded && (
        <div className="order-tracking">
          <div className="progress-track">
            <span style={{ transform: `scaleX(${order.progress / 100})` }} />
          </div>
          <p>
            {arrived
              ? 'Pengantar telah tiba di lokasi pengantaran.'
              : `Pengantaran berlangsung. Perkiraan tiba ${eta}.`}
          </p>
        </div>
      )}
      <button className="order-action" type="button" onClick={onToggle}>
        {expanded ? 'Tutup detail' : arrived ? 'Lihat detail' : 'Pantau pengantaran'}
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </article>
  )
}

export default function VendorDashboard() {
  const {
    state,
    setVendorOnline,
    adjustStock,
  } = useAppState()
  const [editing, setEditing] = useState<FishProduct | null>(null)
  const [expandedOrder, setExpandedOrder] = useState('')
  const sortedOrders = [...state.orders].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <main className="vendor-dashboard">
      <section className={`vendor-status ${state.vendorOnline ? 'vendor-status-online' : ''}`}>
        <div className="vendor-status-copy">
          <span className="status-icon">
            <Store size={23} aria-hidden="true" />
          </span>
          <div>
            <h1>{state.vendorOnline ? 'Aktif melayani' : 'Sedang tidak aktif'}</h1>
            <p>
              {state.vendorOnline
                ? ''
                : 'Penjual tidak ditampilkan pada peta pembeli.'}
            </p>
            <span className="vendor-location-note" role="status">
              <MapPin size={14} aria-hidden="true" />
              Lokasi penjual: {VENDOR_LOCATION.label}
            </span>
          </div>
        </div>
        <button
          className={`status-toggle ${state.vendorOnline ? 'toggle-on' : ''}`}
          type="button"
          role="switch"
          aria-checked={state.vendorOnline}
          aria-label={state.vendorOnline ? 'Nonaktifkan status penjual' : 'Aktifkan status penjual'}
          onClick={() => setVendorOnline(!state.vendorOnline)}
        >
          <span />
        </button>
        <span className="status-toggle-label">
          {state.vendorOnline ? 'Aktif (Online)' : 'Nonaktif (Offline)'}
        </span>
      </section>

      <div className="vendor-columns">
        <section className="vendor-products">
          <div className="section-heading">
            <div>
              <h2>Katalog dan stok</h2>
              <p>Perubahan stok langsung terlihat oleh pembeli.</p>
            </div>
            <span className="section-count">{state.products.length} produk</span>
          </div>
          <div className="inventory-list">
            {state.products.map((product) => (
              <article className="inventory-row" key={product.id}>
                <img
                  src={product.imageUrl}
                  alt=""
                  width="64"
                  height="62"
                  onError={(event) => {
                    event.currentTarget.classList.add('image-unavailable')
                  }}
                />
                <div className="inventory-info">
                  <strong>{product.name}</strong>
                  <span>{money(product.price)} / {product.unit}</span>
                  <span className={product.stock === 0 ? 'stock-zero' : 'stock-amount'}>
                    Tersedia {product.stock} {product.unit}
                  </span>
                </div>
                <div className="stock-controls" aria-label={`Ubah stok ${product.name}`}>
                  <button
                    className="stock-button"
                    type="button"
                    aria-label={`Kurangi stok ${product.name}`}
                    onClick={() => adjustStock(product.id, -1)}
                    disabled={product.stock <= 0}
                  >
                    <Minus size={17} />
                  </button>
                  <span>{product.stock}</span>
                  <button
                    className="stock-button"
                    type="button"
                    aria-label={`Tambah stok ${product.name}`}
                    onClick={() => adjustStock(product.id, 1)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <button
                  className="inventory-edit"
                  type="button"
                  onClick={() => setEditing(product)}
                >
                  Ubah
                </button>
              </article>
            ))}
            {!state.products.length && (
              <p className="empty-note">Belum ada produk. Tambahkan produk untuk mulai melayani pesanan.</p>
            )}
          </div>
          <ProductEditor
            key={editing?.id ?? 'new-product'}
            editing={editing}
            onCancel={() => setEditing(null)}
          />
        </section>

        <section className="vendor-orders">
          <div className="section-heading">
            <div>
              <h2>Pesanan masuk</h2>
              <p>Pembayaran tercatat di sini.</p>
            </div>
            <span className="section-count">{sortedOrders.length} pesanan</span>
          </div>
          {sortedOrders.length ? (
            <div className="orders-list">
              {sortedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  expanded={expandedOrder === order.id}
                  onToggle={() =>
                    setExpandedOrder(expandedOrder === order.id ? '' : order.id)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-orders">
              <span><PackagePlus size={23} aria-hidden="true" /></span>
              <strong>Belum ada pesanan</strong>
              <p>Pesanan pembeli akan muncul di sini.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
