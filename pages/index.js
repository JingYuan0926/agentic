'use client'
import dynamic from 'next/dynamic';
import Agent from '../components/Agent';

// Dynamically import Header with ssr disabled
const Header = dynamic(() => import('../components/Header'), {
    ssr: false
});

export default function Home() {
    return (
        <div className="w-screen h-screen overflow-hidden">
            <Header />
            <Agent />
        </div>
    );
}
