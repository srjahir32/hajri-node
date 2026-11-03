'use client';

import { Fragment } from 'react';
import * as I from '@/components/icons';
import { Css } from '@/components/ui/Css';
import { PhoneOtp, finishAdminLogin } from '@/components/auth/PhoneOtp';
import '@/styles/landing.css';

export default function Body() {
  return (
    <>
      <Css hrefs={['sidebar.css']} />
    <>

    <div className="landing-main-sections">
        <div className="main-header">
            <div className="container main-inner-header">
                <div className="row">
                    <div className="col-6">
                        <a href={"/"}>
                            <img className="img-responsive logo_img " src={"/assets/admin/images/sidebar/logo.svg"} alt="User picture" /><span className="logo_txt">Hajri</span>
                        </a>
                    </div>
                    <div className="col-6 align-content-center" style={{ textAlign: "-webkit-right" }}>
                        <a href={"/employee/login"} className="employee-button">Staff Login</a>
                    </div>
                </div>
            </div>
            
                
                
                
        </div>
        <div className="landing-main-section">
            <div className="container">
                <div className="hajri-signup">
                    <div className="left-main-landing">
                        <div className="landing-left-main-text">
                            <h2 className="manage-hajri proxima_nova_bold">Attendance Through Face Monitoring App</h2>
                            <p className="manage-sub-text proxima_nova_regular section_title manage_staff_attent_con">Manage your staff attendance, salary details and compliances in few clicks + attendance based with face biometric</p>
                        </div>
                        <div className="landing-left-section">
                            <img src={"/assets/admin/images/login/left-image.png"} alt="" />
                        </div>
                    </div>
                    <div className="hajri-left-right landing-right">
                        <div className="hajri-main-right hajri-main-landing-right">
                            <PhoneOtp onVerified={finishAdminLogin} />
                        </div>
                        
                        
                        
                        
                    </div>
                </div>
            </div>
        </div>
        <div className="hajri-main-footer-mobile">
            <h2 className="footer-title proxima_nova_bold">Hajri<span className="footer-title-sub">.app</span></h2>
            <p className="footer-content proxima_nova_semibold">Seamless Solutions for Workforce Management</p>
            <div className="footer-inner-sec">
                <p className="footer-number proxima_nova_semibold">+91 8460460916</p>
                <p className="footer-email proxima_nova_semibold">hajri.app@gmail.com</p>
            </div>
        </div>
    </div>

    </>
    </>
  );
}
