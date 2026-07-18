import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OAuthCallback = () => {
    const { handleOAuthCallback } = useAuth();
    const navigate = useNavigate();
    const [message, setMessage] = useState('Authenticating...');
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const processLogin = async () => {
            const success = handleOAuthCallback();
            
            if (success) {
                setMessage('Login successfully! Redirecting exactly to your dashboard...');
                setIsSuccess(true);
                
                // Pause to ensure React Context is updated globally, and user sees the success message
                setTimeout(() => {
                    const role = localStorage.getItem('role');
                    switch(role?.toUpperCase()) {
                        case 'STUDENT':
                            navigate('/student', { replace: true });
                            break;
                        case 'LECTURER':
                            navigate('/lecturer', { replace: true });
                            break;
                        case 'MANAGER':
                            navigate('/manager', { replace: true });
                            break;
                        case 'TECHNICIAN':
                            navigate('/technician', { replace: true });
                            break;
                        case 'ADMIN':
                            navigate('/admin', { replace: true });
                            break;
                        default:
                            navigate('/', { replace: true }); // Fallback
                    }
                }, 1500);
            } else {
                setMessage('Authentication failed. Returning to login...');
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 1500);
            }
        };

        processLogin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center flex flex-col items-center bg-white p-10 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
                {isSuccess ? (
                    <div className="h-16 w-16 mb-4 text-green-500 bg-green-50 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                ) : (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-500 mb-4"></div>
                )}
                <h2 className="text-2xl font-bold text-gray-800 tracking-wide">
                    {isSuccess ? 'Success!' : 'Please Wait'}
                </h2>
                <p className={`${isSuccess ? 'text-green-600 font-medium' : 'text-gray-500'} mt-3 text-lg`}>
                    {message}
                </p>
            </div>
        </div>
    );
};

export default OAuthCallback;
