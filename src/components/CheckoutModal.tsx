import { useState } from 'react'
import { Check, Copy, MapPin, X } from 'lucide-react'
import { useAppState } from '../context/AppContext'
import type { PaymentMethod } from '../types'

interface CheckoutModalProps {
  paymentMethod: PaymentMethod
  onClose: () => void
  onConfirm: () => string | null
}

function QrPattern() {
  return (
    <div className="qr-pattern" role="img" aria-label="Kode QRIS untuk pembayaran">
      {Array.from({ length: 225 }, (_, index) => {
        const row = Math.floor(index / 15)
        const column = index % 15
        const finder =
          (row < 5 && column < 5) ||
          (row < 5 && column > 9) ||
          (row > 9 && column < 5)
        const finderEdge =
          finder &&
          (row % 10 === 0 ||
            column % 10 === 0 ||
            row % 10 === 4 ||
            column % 10 === 4)
        const filled = finder
          ? finderEdge ||
            ((row < 5 && column < 5 && row >= 2 && row <= 2 && column >= 2 && column <= 2) ||
              (row < 5 && column > 9 && row >= 2 && row <= 2 && column >= 12 && column <= 12) ||
              (row > 9 && column < 5 && row >= 12 && row <= 12 && column >= 2 && column <= 2))
          : (row * 7 + column * 11 + row * column) % 4 !== 0
        return <span className={filled ? 'qr-cell qr-cell-on' : 'qr-cell'} key={index} />
      })}
    </div>
  )
}

export default function CheckoutModal({
  paymentMethod,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  const { state } = useAppState()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const virtualAccount = '8808 2104 5590 1172'
  const isQris = paymentMethod === 'qris'

  const confirm = () => {
    const result = onConfirm()
    if (result) setError(result)
  }

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(virtualAccount.replaceAll(' ', ''))
      setCopied(true)
    } catch (copyError) {
      console.error('Nomor virtual account tidak dapat disalin.', copyError)
      setError('Nomor tidak dapat disalin. Silakan salin secara manual.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <h2 id="payment-title">Selesaikan pembayaran</h2>
            <p>Lanjutkan pembayaran melalui kode QR atau nomor virtual account.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="payment-destination">
          <MapPin size={18} aria-hidden="true" />
          <div>
            <span>Tujuan pengantaran</span>
            <strong>{state.location.label}</strong>
            <small>
              {state.location.lat.toFixed(5)}, {state.location.lng.toFixed(5)}
            </small>
          </div>
        </div>
        <div className="payment-instructions">
          {isQris ? (
            <>
              <QrPattern />
              <p>Pindai kode QR di atas untuk melanjutkan.</p>
            </>
          ) : (
            <div className="virtual-account">
              <span>Nomor virtual account</span>
              <strong>{virtualAccount}</strong>
              <button className="button button-outline" type="button" onClick={copyAccount}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin' : 'Salin nomor'}
              </button>
            </div>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button
          className="button button-primary payment-confirm whitespace-nowrap"
          type="button"
          onClick={confirm}
        >
          Konfirmasi Pembayaran
        </button>
      </section>
    </div>
  )
}
