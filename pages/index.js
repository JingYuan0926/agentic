import dynamic from 'next/dynamic';

// Dynamically import Header with ssr disabled to prevent hydration errors
const Header = dynamic(() => import('../components/Header'), {
    ssr: false
});

export default function Home() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Header />
            <main className="container mx-auto px-4 py-8">
                {/* Your main content here */}
            </main>
        </div>
    );
}
