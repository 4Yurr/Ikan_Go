export type Role = 'buyer' | 'vendor'

export type PaymentMethod =
  | 'qris'
  | 'gopay'
  | 'dana'
  | 'shopeepay'
  | 'bsi'
  | 'bca'
  | 'mandiri'

export type OrderStatus = 'en_route' | 'delivered'

export interface DeliveryLocation {
  label: string
  lat: number
  lng: number
}

export interface FishProduct {
  id: string
  name: string
  price: number
  stock: number
  unit: 'kg' | 'ekor'
  imageUrl: string
}

export interface CartLine {
  productId: string
  quantity: number
}

export interface OrderLine {
  productId: string
  name: string
  quantity: number
  price: number
  unit: FishProduct['unit']
}

export interface FishOrder {
  id: string
  items: OrderLine[]
  location: DeliveryLocation
  paymentMethod: PaymentMethod
  subtotal: number
  deliveryFee: number
  createdAt: number
  status: OrderStatus
  progress: number
  etaSeconds: number
}

export interface AppState {
  role: Role
  location: DeliveryLocation
  vendorOnline: boolean
  products: FishProduct[]
  cart: CartLine[]
  orders: FishOrder[]
}

export const DELIVERY_FEE = 5000

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  qris: 'QRIS',
  gopay: 'GoPay',
  dana: 'DANA',
  shopeepay: 'ShopeePay',
  bsi: 'BSI Mobile',
  bca: 'BCA Mobile',
  mandiri: 'Livin’ by Mandiri',
}

export const VENDOR_LOCATION: DeliveryLocation = {
  label: 'Peunayong',
  lat: 5.5602,
  lng: 95.3186,
}

export const PRESET_LOCATIONS: DeliveryLocation[] = [
  { label: 'Darussalam', lat: 5.5703, lng: 95.3614 },
  { label: 'Peunayong', lat: 5.5575, lng: 95.3217 },
  { label: 'Lampineung', lat: 5.5598, lng: 95.3375 },
  { label: 'Ulee Lheue', lat: 5.5762, lng: 95.2842 },
]

const placeholder = (name: string) =>
  `https://placehold.co/800x600/e8edf0/1d3440?text=${encodeURIComponent(name)}`

export const INITIAL_STATE: AppState = {
  role: 'buyer',
  location: PRESET_LOCATIONS[1],
  vendorOnline: true,
  products: [
    {
      id: 'tongkol-segar',
      name: 'Ikan Tongkol Segar',
      price: 38000,
      stock: 8,
      unit: 'kg',
      imageUrl: placeholder('Ikan Tongkol Segar'),
    },
    {
      id: 'ikan-bandeng',
      name: 'Ikan Bandeng',
      price: 32000,
      stock: 6,
      unit: 'kg',
      imageUrl: placeholder('Ikan Bandeng'),
    },
    {
      id: 'udang-vaname',
      name: 'Udang Vaname',
      price: 65000,
      stock: 4,
      unit: 'kg',
      imageUrl: placeholder('Udang Vaname'),
    },
    {
      id: 'cumi-cumi',
      name: 'Cumi-Cumi',
      price: 72000,
      stock: 3,
      unit: 'kg',
      imageUrl: placeholder('Cumi-Cumi'),
    },
  ],
  cart: [],
  orders: [],
}
