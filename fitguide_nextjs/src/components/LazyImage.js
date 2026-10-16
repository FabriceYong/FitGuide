'use client';

/**
 * LazyImage Component
 * Lazy loads images with intersection observer and fallback support
 */
import React, { useState, useEffect, useRef } from 'react';
import { imageCache } from '../utils/imageCache';
export const LazyImage = ({ src, alt, className = '', fallbackSrc, placeholder, onLoad, onError, threshold = 0.1, rootMargin = '50px', }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);
    const [isInView, setIsInView] = useState(false);
    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!imgRef.current)
            return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            });
        }, {
            threshold,
            rootMargin,
        });
        observer.observe(imgRef.current);
        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin]);
    // Load image when in view
    useEffect(() => {
        if (!isInView)
            return;
        // Check cache first
        if (imageCache.isCached(src)) {
            setImageSrc(src);
            setIsLoading(false);
            onLoad?.();
            return;
        }
        // Load image
        const img = new Image();
        img.onload = () => {
            setImageSrc(src);
            setIsLoading(false);
            imageCache.preload(src);
            onLoad?.();
        };
        img.onerror = () => {
            if (fallbackSrc) {
                setImageSrc(fallbackSrc);
                setIsLoading(false);
            }
            else {
                setHasError(true);
                setIsLoading(false);
            }
            onError?.();
        };
        img.src = src;
    }, [isInView, src, fallbackSrc, onLoad, onError]);
    return (<div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {isLoading && (<div className="absolute inset-0 bg-obsidian-wave animate-pulse">
          {placeholder || (<div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-lime-light border-t-transparent rounded-full animate-spin"></div>
            </div>)}
        </div>)}

      {hasError && !fallbackSrc && (<div className="absolute inset-0 bg-obsidian-wave flex items-center justify-center">
          <div className="text-center text-white-50">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>)}

      {imageSrc && (<div className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`} style={{ backgroundImage: `url(${imageSrc})` }} role="img" aria-label={alt}/>)}
    </div>);
};
export const LazyBackgroundImage = ({ src, className = '', fallbackSrc, children, overlay, onLoad, }) => {
    const [backgroundImage, setBackgroundImage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const divRef = useRef(null);
    const [isInView, setIsInView] = useState(false);
    useEffect(() => {
        if (!divRef.current)
            return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.1, rootMargin: '50px' });
        observer.observe(divRef.current);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (!isInView)
            return;
        if (imageCache.isCached(src)) {
            setBackgroundImage(`url(${src})`);
            setIsLoading(false);
            onLoad?.();
            return;
        }
        const img = new Image();
        img.onload = () => {
            setBackgroundImage(`url(${src})`);
            setIsLoading(false);
            imageCache.preload(src);
            onLoad?.();
        };
        img.onerror = () => {
            if (fallbackSrc) {
                setBackgroundImage(`url(${fallbackSrc})`);
            }
            setIsLoading(false);
        };
        img.src = src;
    }, [isInView, src, fallbackSrc, onLoad]);
    return (<div ref={divRef} className={`relative ${className}`} style={{ backgroundImage }}>
      {isLoading && (<div className="absolute inset-0 bg-obsidian-wave animate-pulse"></div>)}
      {overlay && <div className="absolute inset-0" style={{ backgroundColor: overlay }}></div>}
      {children}
    </div>);
};
