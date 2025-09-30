"use client"
import { useEffect, useRef } from "react"

declare global { interface Window { google: any } }

export default function MapPicker({ onChange }:{ onChange: (v:{lat:number; lng:number; address:string})=>void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mapRef.current) return
    const init = async () => {
      // @ts-ignore
      const loader = (await import("@googlemaps/js-api-loader")).Loader
      const l = new loader({ apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!, libraries: ["places"] })
      const google = await l.load()
      const center = { lat: -23.55052, lng: -46.633308 }
      const map = new google.maps.Map(mapRef.current, { center, zoom: 12, disableDefaultUI: false })
      const marker = new google.maps.Marker({ position: center, map, draggable: true })
      const geocoder = new google.maps.Geocoder()
      const update = (pos:any) => {
        geocoder.geocode({ location: pos }, (res:any, status:any) => {
          const address = res?.[0]?.formatted_address ?? ""
          onChange({ lat: pos.lat(), lng: pos.lng(), address })
        })
      }
      marker.addListener("dragend", () => update(marker.getPosition()))
      map.addListener("click", (e:any) => { marker.setPosition(e.latLng); update(e.latLng) })
      update(marker.getPosition())
    }
    init()
  }, [onChange])
  return <div ref={mapRef} className="h-80 w-full rounded-2xl overflow-hidden" />
}
