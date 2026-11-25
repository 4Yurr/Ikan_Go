import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LocateFixed, MapPin, Search } from 'lucide-react'
import { useAppState } from '../context/AppContext'
import { PRESET_LOCATIONS } from '../types'

interface PlaceResult {
  lat: string
  lon: string
  display_name: string
}

async function findLocations(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(`${query}, Indonesia`)}`,
    { signal },
  )
  if (!response.ok) throw new Error('Pencarian alamat sedang tidak tersedia.')
  return response.json()
}

export default function LocationBar() {
  const { state, setLocation } = useAppState()
  const [address, setAddress] = useState(state.location.label)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([])
  const [tracking, setTracking] = useState(false)
  const watchId = useRef<number | null>(null)
  const skipSearch = useRef(false)

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
    setTracking(false)
  }

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current)
      }
    }
  }, [])

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false
      return
    }
    const query = address.trim()
    const preset = PRESET_LOCATIONS.find(
      (item) => item.label.toLowerCase() === query.toLowerCase(),
    )
    if (preset || query.length < 3) return

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setMessage('')
      try {
        const results = await findLocations(query, controller.signal)
        if (controller.signal.aborted) return
        setSuggestions(results)
        if (!results.length) setMessage('Alamat belum ditemukan. Coba nama area lain.')
      } catch (error) {
        if (controller.signal.aborted) return
        setSuggestions([])
        setMessage(
          error instanceof Error ? error.message : 'Alamat tidak dapat dicari. Coba lagi.',
        )
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [address])

  const selectLocation = (result: PlaceResult) => {
    const lat = Number(result.lat)
    const lng = Number(result.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMessage('Alamat tidak dapat dibuka. Coba hasil lain.')
      return
    }
    const label = result.display_name.split(',')[0]
    stopTracking()
    skipSearch.current = true
    setLocation({ label, lat, lng })
    setAddress(label)
    setSuggestions([])
    setSearching(false)
    setMessage('')
  }

  const chooseAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = address.trim()
    if (!query) {
      setMessage('Masukkan alamat atau pilih area.')
      return
    }

    stopTracking()
    const preset = PRESET_LOCATIONS.find(
      (item) => item.label.toLowerCase() === query.toLowerCase(),
    )
    if (preset) {
      setLocation(preset)
      setAddress(preset.label)
      setSuggestions([])
      setSearching(false)
      setMessage('')
      return
    }
    if (suggestions.length) {
      selectLocation(suggestions[0])
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const results = await findLocations(query)
      if (!results.length) {
        setMessage('Alamat belum ditemukan. Coba nama area lain.')
        return
      }
      selectLocation(results[0])
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Alamat tidak dapat dicari. Coba lagi.',
      )
    } finally {
      setBusy(false)
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setMessage('Browser ini tidak mendukung lokasi GPS.')
      return
    }
    if (watchId.current !== null) {
      stopTracking()
      setMessage('Pembaruan GPS dihentikan.')
      return
    }

    setBusy(true)
    setMessage('')
    setTracking(true)
    watchId.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const current = {
          label: 'Lokasi saat ini',
          lat: coords.latitude,
          lng: coords.longitude,
        }
        skipSearch.current = true
        setLocation(current)
        setAddress(current.label)
        setSuggestions([])
        setMessage('')
        setBusy(false)
      },
      (error) => {
        setMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Pilih alamat secara manual.'
            : 'Lokasi belum tersedia. Coba lagi atau pilih alamat manual.',
        )
        setBusy(false)
        if (error.code === error.PERMISSION_DENIED) stopTracking()
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    )
  }

  return (
    <div className="location-bar">
      <form className="location-search" onSubmit={chooseAddress}>
        <MapPin aria-hidden="true" size={19} />
        <label className="visually-hidden" htmlFor="delivery-address">
          Alamat pengantaran
        </label>
        <input
          id="delivery-address"
          list="aceh-locations"
          value={address}
          onChange={(event) => {
            stopTracking()
            skipSearch.current = false
            setAddress(event.target.value)
            setSuggestions([])
            const query = event.target.value.trim()
            const preset = PRESET_LOCATIONS.find(
              (item) => item.label.toLowerCase() === query.toLowerCase(),
            )
            if (preset || query.length < 3) setSearching(false)
            if (preset) {
              setLocation(preset)
              setMessage('')
            }
          }}
          placeholder="Cari alamat atau area"
          autoComplete="street-address"
          aria-controls="location-results"
          aria-expanded={suggestions.length > 0}
          aria-describedby="location-status"
        />
        <datalist id="aceh-locations">
          {PRESET_LOCATIONS.map((item) => (
            <option key={item.label} value={item.label} />
          ))}
        </datalist>
        <button className="icon-button location-submit" type="submit" disabled={busy || searching}>
          <Search size={17} aria-hidden="true" />
          <span className="visually-hidden">Cari alamat</span>
        </button>
      </form>
      {suggestions.length > 0 && (
        <ul className="location-suggestions" id="location-results" aria-label="Hasil pencarian alamat">
          {suggestions.map((item) => (
            <li key={`${item.lat}:${item.lon}:${item.display_name}`}>
              <button type="button" onClick={() => selectLocation(item)}>
                <MapPin size={14} aria-hidden="true" />
                <span>{item.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        className="button button-outline gps-button"
        type="button"
        onClick={useCurrentLocation}
        disabled={busy}
      >
        <LocateFixed size={17} aria-hidden="true" />
        {busy
          ? 'Mencari lokasi...'
          : tracking
            ? 'Hentikan pembaruan lokasi'
            : 'Gunakan lokasi saat ini'}
      </button>
      <div className="location-feedback" id="location-status" role="status" hidden={suggestions.length > 0}>
        {searching ? 'Mencari alamat…' : message}
      </div>
    </div>
  )
}
