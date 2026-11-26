"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface LeafletLocationPickerProps {
  lat: number;
  lng: number;
  onChange: (nextLat: number, nextLng: number) => void;
  className?: string;
}

export function LeafletLocationPicker({
  lat,
  lng,
  onChange,
  className = "h-48",
}: LeafletLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.circleMarker([lat, lng], {
      radius: 8,
      color: "#2563EB",
      fillColor: "#3B82F6",
      fillOpacity: 0.85,
      weight: 2,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: nLat, lng: nLng } = e.latlng;
      marker.setLatLng([nLat, nLng]);
      onChange(Number(nLat.toFixed(6)), Number(nLng.toFixed(6)));
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!isNaN(lat) && !isNaN(lng)) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1] z-0 ${className}`}
    />
  );
}

