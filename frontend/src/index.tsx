import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';

// Adicionar pixels de tracking
const addTrackingPixels = () => {
  // Meta Pixel
  const metaPixel = document.createElement('script');
  metaPixel.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '581961359233767');
    fbq('track', 'PageView');
  `;
  document.head.appendChild(metaPixel);

  // Meta Pixel noscript
  const metaPixelNoscript = document.createElement('noscript');
  metaPixelNoscript.innerHTML = `
    <img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=581961359233767&ev=PageView&noscript=1" />
  `;
  document.head.appendChild(metaPixelNoscript);

  // Google Ads
  const googleAds = document.createElement('script');
  googleAds.async = true;
  googleAds.src = 'https://www.googletagmanager.com/gtag/js?id=AW-10888031582';
  document.head.appendChild(googleAds);

  const googleAdsConfig = document.createElement('script');
  googleAdsConfig.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-10888031582');
  `;
  document.head.appendChild(googleAdsConfig);
};

// Adicionar pixels quando o DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addTrackingPixels);
} else {
  addTrackingPixels();
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  </React.StrictMode>
);