"use client";

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HEATMAP_POINTS } from './heatmapData';
import styles from './HeatmapMap.module.css';

const CIRCLE_SIZE = 26; // Slightly reduced to increase gap between circles
const KAUNAS_CENTER: L.LatLngExpression = [54.8985, 23.9036];

function getFill(mode: 'before' | 'after', value: number): string {
  if (mode === 'after') return '#22c55e'; // After is healthy green
  
  // Before colors based on reference image
  if (value >= 20) return '#cb0a0d'; // Dark red for 20
  if (value === 18) return '#de2910'; // Red
  if (value === 17) return '#f44d14'; // Red-orange
  if (value === 16) return '#ff6b00'; // Orange
  if (value === 15) return '#ff9900'; // Light orange/gold
  return '#cb0a0d'; // Default dark red
}

interface HeatmapMapProps {
  mode: 'before' | 'after';
}

export default function HeatmapMap({ mode }: HeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      className: styles.tiles,
    }).addTo(map);

    const bounds = L.latLngBounds(HEATMAP_POINTS.map(p => [p.lat, p.lng]));
    
    // Function to fit bounds
    const fit = () => {
      map.fitBounds(bounds, { padding: [40, 40] });
    };

    // Responsive: Re-fit when container size changes
    const observer = new ResizeObserver(() => {
      fit();
    });
    observer.observe(containerRef.current);
    
    mapRef.current = map;
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // First time? Create them.
    if (markersRef.current.length === 0) {
      HEATMAP_POINTS.forEach((point, index) => {
        const isBefore = mode === 'before';
        const value = isBefore ? point.beforeValue : point.afterValue;
        const fill = getFill(mode, value);
        
        const html = `
          <div class="${styles.markerInner}" id="marker-${index}" style="
            background-color: ${fill};
            width:${CIRCLE_SIZE}px; height:${CIRCLE_SIZE}px; line-height:${CIRCLE_SIZE}px; font-size:14px;
          ">
            <span class="${styles.numberValue}" id="number-${index}">
              ${value}
            </span>
          </div>
        `;

        const icon = L.divIcon({
          html,
          className: styles.markerWrapper,
          iconSize: [CIRCLE_SIZE, CIRCLE_SIZE],
          iconAnchor: [CIRCLE_SIZE / 2, CIRCLE_SIZE / 2],
        });
        
        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map);
        markersRef.current.push(marker);
      });
    } else {
      // Subsequent updates: Update the DOM directly for simultaneous transitions
      HEATMAP_POINTS.forEach((point, index) => {
        const isBefore = mode === 'before';
        const targetValue = isBefore ? point.beforeValue : point.afterValue;
        const fill = getFill(mode, targetValue);

        const el = document.getElementById(`marker-${index}`);
        const numEl = document.getElementById(`number-${index}`);
        
        if (el && numEl) {
          // Update colors simultaneously
          el.style.backgroundColor = fill;
          el.style.transitionDelay = '0s';
          
          // Counter Animation Logic
          const startValue = parseInt(numEl.innerText, 10) || 0;
          const duration = 800; // Match CSS background transition 0.8s
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const easedProgress = easeInOutQuad(progress);
            
            const currentValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
            numEl.innerText = String(currentValue);

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      });
    }
  }, [mode]);

  return <div ref={containerRef} className={styles.mapWrap} />;
}
