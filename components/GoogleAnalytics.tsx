'use client'

import Script from 'next/script'

export default function GoogleAnalytics() {
    const gaId = process.env.NEXT_PUBLIC_GA_ID

    // Only render if GA ID is configured
    if (!gaId) {
        return null
    }

    return (
        <>
            {/* Google Analytics - gtag.js */}
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
            />
            <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `,
                }}
            />
        </>
    )
}
