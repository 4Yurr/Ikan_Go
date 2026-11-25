import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DELIVERY_FEE,
  INITIAL_STATE,
  type AppState,
  type DeliveryLocation,
  type FishOrder,
  type FishProduct,
  type PaymentMethod,
  type Role,
} from '../types'

const STORAGE_KEY = 'ikan-go-prototype-v1'

interface OrderResult {
  order?: FishOrder
  error?: string
}

interface AppContextValue {
  state: AppState
  storageError: string
  setRole: (role: Role) => void
  setLocation: (location: DeliveryLocation) => void
  setVendorOnline: (online: boolean) => void
  saveProduct: (product: FishProduct) => void
  adjustStock: (productId: string, amount: number) => void
  setCartQuantity: (productId: string, quantity: number) => void
  placeOrder: (paymentMethod: PaymentMethod) => OrderResult
  advanceTrips: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AppState>
  const location = candidate.location
  if (
    (candidate.role !== 'buyer' && candidate.role !== 'vendor') ||
    !location ||
    typeof location.label !== 'string' ||
    !Number.isFinite(location.lat) ||
    location.lat < -90 ||
    location.lat > 90 ||
    !Number.isFinite(location.lng) ||
    location.lng < -180 ||
    location.lng > 180 ||
    typeof candidate.vendorOnline !== 'boolean' ||
    !Array.isArray(candidate.products) ||
    !Array.isArray(candidate.cart) ||
    !Array.isArray(candidate.orders)
  ) {
    return false
  }

  const validProducts = candidate.products.every(
    (product) =>
      typeof product.id === 'string' &&
      typeof product.name === 'string' &&
      Number.isFinite(product.price) &&
      product.price > 0 &&
      Number.isFinite(product.stock) &&
      product.stock >= 0 &&
      (product.unit === 'kg' || product.unit === 'ekor') &&
      typeof product.imageUrl === 'string',
  )
  const validCart = candidate.cart.every(
    (line) =>
      typeof line.productId === 'string' &&
      Number.isInteger(line.quantity) &&
      line.quantity > 0,
  )
  const validOrders = candidate.orders.every(
    (order) =>
      typeof order.id === 'string' &&
      Array.isArray(order.items) &&
      order.items.every(
        (item) =>
          typeof item.productId === 'string' &&
          typeof item.name === 'string' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          Number.isFinite(item.price) &&
          item.price > 0 &&
          (item.unit === 'kg' || item.unit === 'ekor'),
      ) &&
      typeof order.location?.label === 'string' &&
      Number.isFinite(order.location?.lat) &&
      order.location.lat >= -90 &&
      order.location.lat <= 90 &&
      Number.isFinite(order.location?.lng) &&
      order.location.lng >= -180 &&
      order.location.lng <= 180 &&
      ['qris', 'gopay', 'dana', 'shopeepay', 'bsi', 'bca', 'mandiri'].includes(
        order.paymentMethod,
      ) &&
      Number.isFinite(order.subtotal) &&
      Number.isFinite(order.deliveryFee) &&
      Number.isFinite(order.createdAt) &&
      (order.status === 'en_route' || order.status === 'delivered') &&
      Number.isFinite(order.progress) &&
      Number.isFinite(order.etaSeconds),
  )
  return validProducts && validCart && validOrders
}

function readStoredState(): AppState {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) return INITIAL_STATE

  const parsed: unknown = JSON.parse(saved)
  if (!isAppState(parsed)) {
    throw new Error('Data IKAN GO tersimpan tidak valid.')
  }
  return parsed
}

function readInitialState(): { state: AppState; issue: string } {
  try {
    return { state: readStoredState(), issue: '' }
  } catch (error) {
    console.error('Tidak dapat membaca data IKAN GO dari penyimpanan lokal.', error)
    return {
      state: INITIAL_STATE,
      issue: 'Data lokal tidak dapat dibaca. Perubahan baru mungkin tidak tersimpan.',
    }
  }
}

function clampQuantity(quantity: number, stock: number): number {
  return Math.max(0, Math.min(Math.floor(quantity), Math.floor(stock)))
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readInitialState)
  const stateRef = useRef(initial.state)
  const [state, setState] = useState(initial.state)
  const [storageError, setStorageError] = useState(initial.issue)

  const commit = useCallback(
    (next: AppState) => {
      stateRef.current = next
      setState(next)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        setStorageError('')
      } catch (error) {
        console.error('Tidak dapat menyimpan data IKAN GO ke penyimpanan lokal.', error)
        setStorageError('Penyimpanan lokal gagal. Perubahan hanya ada di tab ini.')
      }
    },
    [setStorageError],
  )

  useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      try {
        const parsed: unknown = JSON.parse(event.newValue)
        if (!isAppState(parsed)) throw new Error('Data IKAN GO tersimpan tidak valid.')
        stateRef.current = parsed
        setState(parsed)
      } catch (error) {
        console.error('Perubahan dari tab lain tidak dapat dibaca.', error)
        setStorageError('Perubahan dari tab lain tidak dapat dibaca.')
      }
    }
    window.addEventListener('storage', syncFromOtherTab)
    return () => window.removeEventListener('storage', syncFromOtherTab)
  }, [])

  const update = useCallback(
    (change: (current: AppState) => AppState) => commit(change(stateRef.current)),
    [commit],
  )

  const setRole = useCallback(
    (role: Role) => update((current) => ({ ...current, role })),
    [update],
  )

  const setLocation = useCallback(
    (location: DeliveryLocation) => update((current) => ({ ...current, location })),
    [update],
  )

  const setVendorOnline = useCallback(
    (online: boolean) => update((current) => ({ ...current, vendorOnline: online })),
    [update],
  )

  const saveProduct = useCallback(
    (product: FishProduct) =>
      update((current) => {
        const exists = current.products.some((item) => item.id === product.id)
        return {
          ...current,
          products: exists
            ? current.products.map((item) => (item.id === product.id ? product : item))
            : [...current.products, product],
        }
      }),
    [update],
  )

  const adjustStock = useCallback(
    (productId: string, amount: number) =>
      update((current) => ({
        ...current,
        products: current.products.map((product) =>
          product.id === productId
            ? { ...product, stock: Math.max(0, product.stock + amount) }
            : product,
        ),
      })),
    [update],
  )

  const setCartQuantity = useCallback(
    (productId: string, quantity: number) =>
      update((current) => {
        const product = current.products.find((item) => item.id === productId)
        if (!product) {
          return {
            ...current,
            cart: current.cart.filter((line) => line.productId !== productId),
          }
        }
        const safeQuantity = clampQuantity(quantity, product.stock)
        return {
          ...current,
          cart:
            safeQuantity === 0
              ? current.cart.filter((line) => line.productId !== productId)
              : [
                  ...current.cart.filter((line) => line.productId !== productId),
                  { productId, quantity: safeQuantity },
                ],
        }
      }),
    [update],
  )

  const placeOrder = useCallback(
    (paymentMethod: PaymentMethod): OrderResult => {
      let latest = stateRef.current
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed: unknown = JSON.parse(stored)
          if (!isAppState(parsed)) throw new Error('Data IKAN GO tersimpan tidak valid.')
          latest = parsed
        }
      } catch (error) {
        console.error('Tidak dapat memeriksa stok terbaru.', error)
        setStorageError('Stok terbaru tidak dapat diperiksa. Coba muat ulang aplikasi.')
        return { error: 'Stok terbaru tidak dapat diperiksa. Coba lagi.' }
      }

      if (!latest.vendorOnline) return { error: 'Penjual sedang tidak aktif.' }
      if (!latest.cart.length) return { error: 'Keranjang masih kosong.' }

      const orderItems: FishOrder['items'] = []
      for (const line of latest.cart) {
        const product = latest.products.find((item) => item.id === line.productId)
        if (!product || line.quantity > product.stock) {
          stateRef.current = latest
          setState(latest)
          return {
            error: `${product?.name ?? 'Salah satu ikan'} tidak lagi tersedia sebanyak jumlah di keranjang.`,
          }
        }
        orderItems.push({
          productId: product.id,
          name: product.name,
          quantity: line.quantity,
          price: product.price,
          unit: product.unit,
        })
      }

      const subtotal = orderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      )
      const order: FishOrder = {
        id: crypto.randomUUID(),
        items: orderItems,
        location: latest.location,
        paymentMethod,
        subtotal,
        deliveryFee: DELIVERY_FEE,
        createdAt: Date.now(),
        status: 'en_route',
        progress: 0,
        etaSeconds: 30,
      }
      const next: AppState = {
        ...latest,
        products: latest.products.map((product) => {
          const ordered = orderItems.find((item) => item.productId === product.id)
          return ordered
            ? { ...product, stock: product.stock - ordered.quantity }
            : product
        }),
        cart: [],
        orders: [order, ...latest.orders],
      }
      commit(next)
      return { order }
    },
    [commit],
  )

  const advanceTrips = useCallback(
    () =>
      update((current) => ({
        ...current,
        orders: current.orders.map((order) => {
          if (order.status !== 'en_route') return order
          const etaSeconds = Math.max(0, order.etaSeconds - 1)
          const progress = etaSeconds === 0 ? 100 : Math.min(100, order.progress + 100 / 30)
          return {
            ...order,
            etaSeconds,
            progress,
            status: etaSeconds === 0 ? 'delivered' : 'en_route',
          }
        }),
      })),
    [update],
  )

  useEffect(() => {
    if (!state.orders.some((order) => order.status === 'en_route')) return
    const timer = window.setInterval(advanceTrips, 1000)
    return () => window.clearInterval(timer)
  }, [advanceTrips, state.orders])

  return (
    <AppContext.Provider
      value={{
        state,
        storageError,
        setRole,
        setLocation,
        setVendorOnline,
        saveProduct,
        adjustStock,
        setCartQuantity,
        placeOrder,
        advanceTrips,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppState(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppState must be used inside AppProvider.')
  return value
}
