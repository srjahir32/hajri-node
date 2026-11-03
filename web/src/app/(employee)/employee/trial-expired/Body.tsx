'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { count } from '@/lib/blade';

export default function Body() {
  return (
    <>

    

    <main className="flex-1 overflow-y-auto relative z-0">
        
        <div className="bg-particles">
            <div className="particle" style={{ width: "150px", height: "150px", left: "10%", bottom: "-150px", animationDuration: "25s" }}></div>
            <div className="particle" style={{ width: "80px", height: "80px", left: "40%", bottom: "-80px", animationDuration: "18s", animationDelay: "2s" }}></div>
            <div className="particle" style={{ width: "200px", height: "200px", left: "80%", bottom: "-200px", animationDuration: "30s", animationDelay: "5s" }}></div>
            <div className="particle" style={{ width: "60px", height: "60px", left: "60%", bottom: "-60px", animationDuration: "15s", animationDelay: "8s" }}></div>
        </div>

        <div className="expired-container animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="expired-card">
                <div className="icon-wrapper">
                    <I.Ie71b12 />
                </div>
                
                <h2 className="expired-title">Business Subscription Expired!</h2>
                <p className="expired-subtitle">
                    The free trial or subscription for this business account has expired. To continue using all features, an active subscription is required.
                </p>
                
                <div className="action-box">
                    <p>
                        <I.Ic113da />
                        Please ask your Employer to renew the subscription.
                    </p>
                </div>
            </div>
        </div>
    </main>

    </>
  );
}
