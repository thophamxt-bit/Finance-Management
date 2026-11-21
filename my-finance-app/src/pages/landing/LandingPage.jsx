import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Landing } from '../../components/landing/Landing';

const LandingPage = () => {
    const navigate = useNavigate();
    const handleStart = () => {
        const token = localStorage.getItem("token");
        if (token) {
            navigate("/dashboard");
        } else {
            navigate("/login");
        }
    };

    return <Landing onStart={handleStart} />;
};

export default LandingPage;